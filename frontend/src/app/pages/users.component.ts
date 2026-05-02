import { Component, OnInit } from '@angular/core';
import { UserAdminService, User } from '../auth/user-admin.service';
import { RoleAdminService, Role as UserRole } from '../auth/role-admin.service';
import { CardComponent } from '../theme/shared/components/card/card.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AosService } from '../aos/aos.service';

@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [CommonModule, CardComponent, FormsModule],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss'
})
export class UsersPageComponent implements OnInit {
  users: User[] = [];
  loading = false;
  showForm = false;
  isEditing = false;
  editingId: number | null = null;
  availablePermissions: string[] = [];
  roles: string[] = [];
  rolePermissions: Record<string, string[]> = {};
  q = '';
  filterRole = '';
  filterEnabled: '' | 'true' | 'false' = '';

  banner: { kind: 'success' | 'info' | 'danger'; message: string } | null = null;
  private bannerTimer: ReturnType<typeof setTimeout> | null = null;
  
  newUser = {
    username: '',
    password: '',
    email: '',
    fullName: '',
    phoneNumber: '',
    role: 'CHARGE_DOSSIER',
    permissions: [] as string[]
  };

  constructor(
    private userAdminService: UserAdminService,
    private roleService: RoleAdminService,
    private aos: AosService
  ) {}

  ngOnInit() {
    this.loadUsers();
    this.loadPermissions();
    this.loadRoles();
  }

  loadRoles() {
    this.roleService.getAllRoles().subscribe({
      next: (data) => {
        this.roles = data.map(r => r.name);
        this.rolePermissions = data.reduce((acc, r) => {
          acc[r.name] = r.permissions || [];
          return acc;
        }, {} as Record<string, string[]>);
        if (this.roles.length > 0 && !this.newUser.role) {
          this.newUser.role = this.roles.find(r => r === 'CHARGE_DOSSIER') || this.roles[0];
        }
        if (this.newUser.role) {
          this.syncPermissionsForRole(this.newUser.role);
        }
        setTimeout(() => this.aos.refresh(), 0);
      },
      error: () => {
        this.showBanner('Erreur lors du chargement des rôles.', 'danger');
        setTimeout(() => this.aos.refresh(), 0);
      }
    });
  }

  loadPermissions() {
    this.userAdminService.getAvailablePermissions().subscribe({
      next: (data) => {
        this.availablePermissions = data;
        setTimeout(() => this.aos.refresh(), 0);
      },
      error: () => {
        this.showBanner('Erreur lors du chargement des permissions.', 'danger');
        setTimeout(() => this.aos.refresh(), 0);
      }
    });
  }

  loadUsers() {
    this.loading = true;
    this.userAdminService.getAllUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.loading = false;
        setTimeout(() => this.aos.refresh(), 0);
      },
      error: () => {
        this.loading = false;
        this.showBanner('Erreur lors du chargement des utilisateurs.', 'danger');
        setTimeout(() => this.aos.refresh(), 0);
      }
    });
  }

  toggleForm() {
    this.showForm = !this.showForm;
    if (!this.showForm) {
      this.resetNewUser();
    }
    else setTimeout(() => this.aos.refresh(), 0);
  }

  closeForm(): void {
    this.showForm = false;
    this.resetNewUser();
  }

  resetNewUser() {
    this.isEditing = false;
    this.editingId = null;
    this.newUser = {
      username: '',
      password: '',
      email: '',
      fullName: '',
      phoneNumber: '',
      role: this.roles.find(r => r === 'CHARGE_DOSSIER') || this.roles[0] || 'CHARGE_DOSSIER',
      permissions: []
    };
    this.syncPermissionsForRole(this.newUser.role);
  }

  onPermissionChange(permission: string, event: any) {
    if (event.target.checked) {
      this.newUser.permissions.push(permission);
    } else {
      this.newUser.permissions = this.newUser.permissions.filter(p => p !== permission);
    }
  }

  isPermissionSelected(permission: string): boolean {
    return this.newUser.permissions.includes(permission);
  }

  editUser(user: User) {
    this.isEditing = true;
    this.editingId = user.id;
    this.newUser = {
      username: user.username,
      password: '', // On ne remplit pas le mot de passe en édition
      email: user.email,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber || '',
      role: user.role,
      permissions: []
    };
    this.syncPermissionsForRole(this.newUser.role);
    this.showForm = true;
  }

  saveUser() {
    this.syncPermissionsForRole(this.newUser.role);
    if (this.isEditing && this.editingId) {
      this.userAdminService.updateUser(this.editingId, this.newUser).subscribe({
        next: () => {
          this.loadUsers();
          this.closeForm();
          this.showBanner('Utilisateur mis à jour.', 'success');
        },
        error: () => this.showBanner('Erreur lors de la modification de l’utilisateur.', 'danger')
      });
    } else {
      this.userAdminService.createUser(this.newUser).subscribe({
        next: () => {
          this.loadUsers();
          this.closeForm();
          this.showBanner('Utilisateur créé.', 'success');
        },
        error: () => this.showBanner('Erreur lors de la création de l’utilisateur.', 'danger')
      });
    }
  }

  createUser() {
    this.saveUser();
  }

  onRoleChange(roleName: string): void {
    this.newUser.role = roleName;
    this.syncPermissionsForRole(roleName);
  }

  private syncPermissionsForRole(roleName: string): void {
    this.newUser.permissions = [...(this.rolePermissions[roleName] || [])];
  }

  toggleStatus(user: User) {
    this.userAdminService.toggleStatus(user.id).subscribe({
      next: () => {
        user.enabled = !user.enabled;
        this.showBanner(user.enabled ? 'Utilisateur activé.' : 'Utilisateur désactivé.', 'info');
      },
      error: () => this.showBanner('Erreur lors du changement de statut.', 'danger')
    });
  }

  deleteUser(id: number) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      this.userAdminService.deleteUser(id).subscribe({
        next: () => {
          this.loadUsers();
          this.showBanner('Utilisateur supprimé.', 'info');
        },
        error: () => this.showBanner('Erreur lors de la suppression de l’utilisateur.', 'danger')
      });
    }
  }

  filteredUsers(): User[] {
    const q = this.q.trim().toLowerCase();
    return this.users.filter((u) => {
      const okQ =
        !q ||
        [u.username, u.fullName ?? '', u.email ?? '', u.phoneNumber ?? '', u.role].some((v) =>
          String(v).toLowerCase().includes(q)
        );
      const okRole = !this.filterRole || u.role === this.filterRole;
      const okEnabled = this.filterEnabled === '' || u.enabled === (this.filterEnabled === 'true');
      return okQ && okRole && okEnabled;
    });
  }

  private showBanner(message: string, kind: 'success' | 'info' | 'danger'): void {
    this.banner = { kind, message };
    if (this.bannerTimer) clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => {
      this.banner = null;
      this.bannerTimer = null;
    }, 2500);
  }
}
