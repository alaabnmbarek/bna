import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CardComponent } from '../theme/shared/components/card/card.component';
import { AuthService } from '../auth/auth.service';
import { ProfileService } from '../auth/profile.service';

@Component({
  selector: 'app-risque-patrimoines',
  standalone: true,
  imports: [CommonModule, FormsModule, CardComponent],
  templateUrl: './risque-patrimoines.component.html',
  styleUrl: './risque-patrimoines.component.scss'
})
export class RisquePatrimoinesPageComponent implements OnInit {
  private readonly storageKey = 'pfe.risque.patrimoines.v1';
  profileImage: string | undefined = 'assets/images/user/avatar-4.jpg';

  banner: { kind: 'success' | 'info' | 'danger'; message: string } | null = null;
  private bannerTimer: ReturnType<typeof setTimeout> | null = null;

  search = '';
  editingId: string | null = null;

  form = {
    nom: '',
    prenom: '',
    dateNaissance: '',
    numeroDossier: '',
    biensImmobiliers: '',
    comptesBancaires: '',
    investissementsActions: '',
    creditsPrets: '',
    autresDettes: '',
    dettesFiscalesPenalites: ''
  };

  patrimoines: Array<{
    id: string;
    nom: string;
    prenom: string;
    dateNaissance: string;
    numeroDossier: string;
    biensImmobiliers: string;
    comptesBancaires: string;
    investissementsActions: string;
    creditsPrets: string;
    autresDettes: string;
    dettesFiscalesPenalites: string;
    createdAt: string;
  }> = [];

  constructor(
    public auth: AuthService,
    private profileService: ProfileService
  ) {}

  ngOnInit(): void {
    this.profileService.profile$.subscribe(profile => {
      if (profile && profile.profileImage) {
        this.profileImage = profile.profileImage;
      } else {
        this.profileImage = 'assets/images/user/avatar-4.jpg';
      }
    });

    if (this.auth.token()) {
      this.profileService.getProfile().subscribe();
    }

    this.patrimoines = this.storageRead(this.storageKey, []);
  }

  save(): void {
    const requiredOk = this.form.nom.trim() && this.form.prenom.trim() && this.form.numeroDossier.trim();
    if (!requiredOk) {
      this.showBanner('Veuillez renseigner : Nom, Prénom et Numéro dossier.', 'danger');
      return;
    }

    const payload = {
      nom: this.form.nom.trim(),
      prenom: this.form.prenom.trim(),
      dateNaissance: this.form.dateNaissance || '',
      numeroDossier: this.form.numeroDossier.trim(),
      biensImmobiliers: this.form.biensImmobiliers || '',
      comptesBancaires: this.form.comptesBancaires || '',
      investissementsActions: this.form.investissementsActions || '',
      creditsPrets: this.form.creditsPrets || '',
      autresDettes: this.form.autresDettes || '',
      dettesFiscalesPenalites: this.form.dettesFiscalesPenalites || ''
    };

    if (this.editingId) {
      this.patrimoines = this.patrimoines.map((p) => (p.id === this.editingId ? { ...p, ...payload } : p));
      this.persist();
      this.showBanner('Patrimoine mis à jour.', 'success');
      this.editingId = null;
      return;
    }

    const row = {
      id: this.newId(),
      ...payload,
      createdAt: this.now()
    };
    this.patrimoines = [row, ...this.patrimoines];
    this.persist();
    this.showBanner('Patrimoine enregistré.', 'success');
  }

  openEdit(row: { id: string } & typeof this.form): void {
    this.editingId = row.id;
    this.form = {
      nom: row.nom,
      prenom: row.prenom,
      dateNaissance: row.dateNaissance,
      numeroDossier: row.numeroDossier,
      biensImmobiliers: row.biensImmobiliers,
      comptesBancaires: row.comptesBancaires,
      investissementsActions: row.investissementsActions,
      creditsPrets: row.creditsPrets,
      autresDettes: row.autresDettes,
      dettesFiscalesPenalites: row.dettesFiscalesPenalites
    };
  }

  remove(row: { id: string; nom: string; prenom: string; numeroDossier: string }): void {
    const ok = confirm(`Supprimer le patrimoine de ${row.nom} ${row.prenom} (dossier ${row.numeroDossier}) ?`);
    if (!ok) return;
    this.patrimoines = this.patrimoines.filter((p) => p.id !== row.id);
    this.persist();
    if (this.editingId === row.id) {
      this.editingId = null;
      this.reset();
    }
    this.showBanner('Patrimoine supprimé.', 'info');
  }

  reset(): void {
    this.form = {
      nom: '',
      prenom: '',
      dateNaissance: '',
      numeroDossier: '',
      biensImmobiliers: '',
      comptesBancaires: '',
      investissementsActions: '',
      creditsPrets: '',
      autresDettes: '',
      dettesFiscalesPenalites: ''
    };
  }

  cancelEdit(): void {
    this.editingId = null;
    this.reset();
  }

  filteredPatrimoines(): typeof this.patrimoines {
    const q = this.search.trim().toLowerCase();
    if (!q) return this.patrimoines;
    return this.patrimoines.filter((p) => {
      return (
        p.nom.toLowerCase().includes(q) ||
        p.prenom.toLowerCase().includes(q) ||
        p.numeroDossier.toLowerCase().includes(q)
      );
    });
  }

  filteredCount(): number {
    return this.filteredPatrimoines().length;
  }

  private newId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return String(Date.now()) + '-' + Math.random().toString(16).slice(2);
  }

  private now(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
  }

  private persist(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.patrimoines));
    } catch {
      return;
    }
  }

  private storageRead<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
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
