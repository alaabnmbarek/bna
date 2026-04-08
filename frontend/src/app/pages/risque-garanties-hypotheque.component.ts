import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CardComponent } from '../theme/shared/components/card/card.component';
import { AuthService } from '../auth/auth.service';
import { ProfileService } from '../auth/profile.service';

@Component({
  selector: 'app-risque-garanties-hypotheque',
  standalone: true,
  imports: [CommonModule, FormsModule, CardComponent],
  templateUrl: './risque-garanties-hypotheque.component.html',
  styleUrl: './risque-garanties-hypotheque.component.scss'
})
export class RisqueGarantiesHypothequePageComponent implements OnInit {
  private readonly keyHypotheque = 'pfe.risque.garanties.hypotheques.v1';
  profileImage: string | undefined = 'assets/images/user/avatar-4.jpg';

  banner: { kind: 'success' | 'info' | 'danger'; message: string } | null = null;
  private bannerTimer: ReturnType<typeof setTimeout> | null = null;

  search = '';
  editingId: string | null = null;

  hypotheque = {
    dossier: '',
    numeroCompte: '',
    dateEnregistrement: '',
    dateInscription: '',
    montant: '',
    typeBien: '',
    adresse: '',
    mainLevee: '' as '' | 'OUI' | 'NON',
    estimationInitiale: '',
    pariPassu1: '' as '' | 'OUI' | 'NON',
    estimationCourante: '',
    numeroTitre: '',
    dateRenouvellement: '',
    dateExpiration: '',
    nomCaution: '',
    dateDelivrance: '',
    pariPassu2: '' as '' | 'OUI' | 'NON'
  };

  hypotheques: Array<{
    id: string;
    createdAt: string;
    dossier: string;
    numeroCompte: string;
    dateEnregistrement: string;
    dateInscription: string;
    montant: string;
    typeBien: string;
    adresse: string;
    mainLevee: '' | 'OUI' | 'NON';
    estimationInitiale: string;
    pariPassu1: '' | 'OUI' | 'NON';
    estimationCourante: string;
    numeroTitre: string;
    dateRenouvellement: string;
    dateExpiration: string;
    nomCaution: string;
    dateDelivrance: string;
    pariPassu2: '' | 'OUI' | 'NON';
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

    this.hypotheques = this.storageRead(this.keyHypotheque, []);
  }

  save(): void {
    const ok = this.hypotheque.dossier.trim() && this.hypotheque.numeroCompte.trim();
    if (!ok) {
      this.showBanner('Veuillez renseigner : Dossier et N° compte.', 'danger');
      return;
    }

    if (this.editingId) {
      this.hypotheques = this.hypotheques.map((h) => (h.id === this.editingId ? { ...h, ...this.hypotheque } : h));
      this.persist();
      this.editingId = null;
      this.showBanner('Hypothèque mise à jour.', 'success');
      return;
    }

    this.hypotheques = [
      {
        id: this.newId(),
        createdAt: this.now(),
        ...this.hypotheque
      },
      ...this.hypotheques
    ];
    this.persist();
    this.showBanner('Hypothèque enregistrée.', 'success');
  }

  reset(): void {
    this.hypotheque = {
      dossier: '',
      numeroCompte: '',
      dateEnregistrement: '',
      dateInscription: '',
      montant: '',
      typeBien: '',
      adresse: '',
      mainLevee: '',
      estimationInitiale: '',
      pariPassu1: '',
      estimationCourante: '',
      numeroTitre: '',
      dateRenouvellement: '',
      dateExpiration: '',
      nomCaution: '',
      dateDelivrance: '',
      pariPassu2: ''
    };
  }

  cancelEdit(): void {
    this.editingId = null;
    this.reset();
  }

  openEdit(row: { id: string } & typeof this.hypotheque): void {
    this.editingId = row.id;
    this.hypotheque = {
      dossier: row.dossier,
      numeroCompte: row.numeroCompte,
      dateEnregistrement: row.dateEnregistrement,
      dateInscription: row.dateInscription,
      montant: row.montant,
      typeBien: row.typeBien,
      adresse: row.adresse,
      mainLevee: row.mainLevee,
      estimationInitiale: row.estimationInitiale,
      pariPassu1: row.pariPassu1,
      estimationCourante: row.estimationCourante,
      numeroTitre: row.numeroTitre,
      dateRenouvellement: row.dateRenouvellement,
      dateExpiration: row.dateExpiration,
      nomCaution: row.nomCaution,
      dateDelivrance: row.dateDelivrance,
      pariPassu2: row.pariPassu2
    };
  }

  remove(row: { id: string; numeroCompte: string }): void {
    const ok = confirm(`Supprimer l’hypothèque du compte ${row.numeroCompte} ?`);
    if (!ok) return;
    this.hypotheques = this.hypotheques.filter((h) => h.id !== row.id);
    this.persist();
    if (this.editingId === row.id) {
      this.editingId = null;
      this.reset();
    }
    this.showBanner('Hypothèque supprimée.', 'info');
  }

  filtered(): typeof this.hypotheques {
    const q = this.search.trim().toLowerCase();
    if (!q) return this.hypotheques;
    return this.hypotheques.filter((h) => {
      return (
        (h.dossier || '').toLowerCase().includes(q) ||
        (h.numeroCompte || '').toLowerCase().includes(q) ||
        (h.typeBien || '').toLowerCase().includes(q) ||
        (h.numeroTitre || '').toLowerCase().includes(q)
      );
    });
  }

  private persist(): void {
    this.storageWrite(this.keyHypotheque, this.hypotheques);
  }

  private storageWrite(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
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

  private showBanner(message: string, kind: 'success' | 'info' | 'danger'): void {
    this.banner = { kind, message };
    if (this.bannerTimer) clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => {
      this.banner = null;
      this.bannerTimer = null;
    }, 2500);
  }
}
