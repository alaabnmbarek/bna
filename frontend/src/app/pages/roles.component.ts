import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardComponent } from '../theme/shared/components/card/card.component';
import { RoleAdminService, Role } from '../auth/role-admin.service';
import { UserAdminService } from '../auth/user-admin.service';

@Component({
  selector: 'app-roles-page',
  standalone: true,
  imports: [CommonModule, CardComponent, FormsModule],
  templateUrl: './roles.component.html',
  styleUrl: './roles.component.scss'
})
export class RolesPageComponent implements OnInit {
  roles: Role[] = [];
  availablePermissions: string[] = [];
  loading = false;
  showForm = false;
  isEditing = false;
  editingId: number | null = null;
  q = '';

  banner: { kind: 'success' | 'info' | 'danger'; message: string } | null = null;
  private bannerTimer: ReturnType<typeof setTimeout> | null = null;

  newRole: Role = {
    name: '',
    permissions: []
  };

  constructor(
    private roleService: RoleAdminService,
    private userService: UserAdminService
  ) {}

  ngOnInit() {
    this.loadRoles();
    this.loadPermissions();
  }

  loadRoles() {
    this.loading = true;
    this.roleService.getAllRoles().subscribe({
      next: (data) => {
        this.roles = data;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.showBanner('Erreur lors du chargement des rôles.', 'danger');
      }
    });
  }

  loadPermissions() {
    this.userService.getAvailablePermissions().subscribe({
      next: (data) => this.availablePermissions = data,
      error: () => this.showBanner('Erreur lors du chargement des permissions.', 'danger')
    });
  }

  toggleForm() {
    this.showForm = !this.showForm;
    if (!this.showForm) {
      this.resetNewRole();
    }
  }

  closeForm(): void {
    this.showForm = false;
    this.resetNewRole();
  }

  resetNewRole() {
    this.isEditing = false;
    this.editingId = null;
    this.newRole = {
      name: '',
      permissions: []
    };
  }

  onPermissionChange(permission: string, event: any) {
    if (event.target.checked) {
      this.newRole.permissions.push(permission);
    } else {
      this.newRole.permissions = this.newRole.permissions.filter(p => p !== permission);
    }
  }

  isPermissionSelected(permission: string): boolean {
    return this.newRole.permissions.includes(permission);
  }

  editRole(role: Role) {
    this.isEditing = true;
    this.editingId = role.id!;
    this.newRole = {
      name: role.name,
      permissions: [...role.permissions]
    };
    this.showForm = true;
  }

  saveRole() {
    if (this.isEditing && this.editingId) {
      this.roleService.updateRole(this.editingId, this.newRole).subscribe({
        next: () => {
          this.loadRoles();
          this.closeForm();
          this.showBanner('Rôle mis à jour.', 'success');
        },
        error: () => this.showBanner('Erreur lors de la modification du rôle.', 'danger')
      });
    } else {
      this.roleService.createRole(this.newRole).subscribe({
        next: () => {
          this.loadRoles();
          this.closeForm();
          this.showBanner('Rôle créé.', 'success');
        },
        error: () => this.showBanner('Erreur lors de la création du rôle.', 'danger')
      });
    }
  }

  deleteRole(id: number) {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce rôle ?')) {
      this.roleService.deleteRole(id).subscribe({
        next: () => {
          this.loadRoles();
          this.showBanner('Rôle supprimé.', 'info');
        },
        error: () => this.showBanner('Erreur lors de la suppression du rôle.', 'danger')
      });
    }
  }

  filteredRoles(): Role[] {
    const q = this.q.trim().toLowerCase();
    if (!q) return this.roles;
    return this.roles.filter((r) => {
      return (
        String(r.id ?? '').toLowerCase().includes(q) ||
        (r.name || '').toLowerCase().includes(q) ||
        String(r.permissions?.length ?? 0).includes(q)
      );
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
