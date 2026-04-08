import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CardComponent } from '../theme/shared/components/card/card.component';
import { AuthService } from '../auth/auth.service';
import { ProfileService } from '../auth/profile.service';

@Component({
  selector: 'app-risque-garanties-nantissement',
  standalone: true,
  imports: [CommonModule, FormsModule, CardComponent],
  templateUrl: './risque-garanties-nantissement.component.html',
  styleUrl: './risque-garanties-nantissement.component.scss'
})
export class RisqueGarantiesNantissementPageComponent implements OnInit {
  private readonly keyFonds = 'pfe.risque.garanties.nantissementsFonds.v1';
  private readonly keyVehicule = 'pfe.risque.garanties.nantissementsVehicule.v1';
  profileImage: string | undefined = 'assets/images/user/avatar-4.jpg';

  activeType: 'fonds' | 'vehicule' = 'fonds';

  banner: { kind: 'success' | 'info' | 'danger'; message: string } | null = null;
  private bannerTimer: ReturnType<typeof setTimeout> | null = null;

  searchFonds = '';
  searchVehicule = '';

  editingFondsId: string | null = null;
  editingVehiculeId: string | null = null;

  fonds = {
    nomDossier: '',
    numeroCompte: '',
    estimationInitiale: '',
    description: '',
    dateEnregistrement: '',
    rang: '',
    adresse: '',
    garantDebiteur: '',
    numeroDocument: '',
    montant: '',
    estimationCourante: '',
    numeroRegistreCommerce: '',
    dateInscription: '',
    typeDocumentCaution: '',
    nomCaution: ''
  };

  vehicule = {
    dossier: '',
    numeroCompte: '',
    estimationInitiale: '',
    dateEnregistrement: '',
    description: '',
    matricule: '',
    montant: '',
    estimationCourante: '',
    dateInscription: '',
    nomCaution: ''
  };

  nantissementsFonds: Array<{
    id: string;
    createdAt: string;
    nomDossier: string;
    numeroCompte: string;
    estimationInitiale: string;
    description: string;
    dateEnregistrement: string;
    rang: string;
    adresse: string;
    garantDebiteur: string;
    numeroDocument: string;
    montant: string;
    estimationCourante: string;
    numeroRegistreCommerce: string;
    dateInscription: string;
    typeDocumentCaution: string;
    nomCaution: string;
  }> = [];

  nantissementsVehicule: Array<{
    id: string;
    createdAt: string;
    dossier: string;
    numeroCompte: string;
    estimationInitiale: string;
    dateEnregistrement: string;
    description: string;
    matricule: string;
    montant: string;
    estimationCourante: string;
    dateInscription: string;
    nomCaution: string;
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

    this.nantissementsFonds = this.storageRead(this.keyFonds, []);
    this.nantissementsVehicule = this.storageRead(this.keyVehicule, []);
  }

  saveFonds(): void {
    const ok = this.fonds.nomDossier.trim() && this.fonds.numeroCompte.trim();
    if (!ok) {
      this.showBanner('Veuillez renseigner : Nom Dossier et N° compte.', 'danger');
      return;
    }
    if (this.editingFondsId) {
      this.nantissementsFonds = this.nantissementsFonds.map((n) =>
        n.id === this.editingFondsId ? { ...n, ...this.fonds } : n
      );
      this.persistFonds();
      this.editingFondsId = null;
      this.showBanner('Nantissement (Fonds de commerce) mis à jour.', 'success');
      return;
    }

    this.nantissementsFonds = [
      {
        id: this.newId(),
        createdAt: this.now(),
        ...this.fonds
      },
      ...this.nantissementsFonds
    ];
    this.persistFonds();
    this.showBanner('Nantissement (Fonds de commerce) enregistré.', 'success');
  }

  resetFonds(): void {
    this.fonds = {
      nomDossier: '',
      numeroCompte: '',
      estimationInitiale: '',
      description: '',
      dateEnregistrement: '',
      rang: '',
      adresse: '',
      garantDebiteur: '',
      numeroDocument: '',
      montant: '',
      estimationCourante: '',
      numeroRegistreCommerce: '',
      dateInscription: '',
      typeDocumentCaution: '',
      nomCaution: ''
    };
  }

  cancelEditFonds(): void {
    this.editingFondsId = null;
    this.resetFonds();
  }

  openEditFonds(row: { id: string } & typeof this.fonds): void {
    this.editingFondsId = row.id;
    this.fonds = {
      nomDossier: row.nomDossier,
      numeroCompte: row.numeroCompte,
      estimationInitiale: row.estimationInitiale,
      description: row.description,
      dateEnregistrement: row.dateEnregistrement,
      rang: row.rang,
      adresse: row.adresse,
      garantDebiteur: row.garantDebiteur,
      numeroDocument: row.numeroDocument,
      montant: row.montant,
      estimationCourante: row.estimationCourante,
      numeroRegistreCommerce: row.numeroRegistreCommerce,
      dateInscription: row.dateInscription,
      typeDocumentCaution: row.typeDocumentCaution,
      nomCaution: row.nomCaution
    };
  }

  removeFonds(row: { id: string; numeroCompte: string }): void {
    const ok = confirm(`Supprimer le nantissement (Fonds) du compte ${row.numeroCompte} ?`);
    if (!ok) return;
    this.nantissementsFonds = this.nantissementsFonds.filter((n) => n.id !== row.id);
    this.persistFonds();
    if (this.editingFondsId === row.id) {
      this.editingFondsId = null;
      this.resetFonds();
    }
    this.showBanner('Nantissement (Fonds) supprimé.', 'info');
  }

  saveVehicule(): void {
    const ok = this.vehicule.dossier.trim() && this.vehicule.numeroCompte.trim() && this.vehicule.matricule.trim();
    if (!ok) {
      this.showBanner('Veuillez renseigner : Dossier, N° compte et Matricule.', 'danger');
      return;
    }
    if (this.editingVehiculeId) {
      this.nantissementsVehicule = this.nantissementsVehicule.map((n) =>
        n.id === this.editingVehiculeId ? { ...n, ...this.vehicule } : n
      );
      this.persistVehicule();
      this.editingVehiculeId = null;
      this.showBanner('Nantissement (Véhicule) mis à jour.', 'success');
      return;
    }

    this.nantissementsVehicule = [
      {
        id: this.newId(),
        createdAt: this.now(),
        ...this.vehicule
      },
      ...this.nantissementsVehicule
    ];
    this.persistVehicule();
    this.showBanner('Nantissement (Véhicule) enregistré.', 'success');
  }

  resetVehicule(): void {
    this.vehicule = {
      dossier: '',
      numeroCompte: '',
      estimationInitiale: '',
      dateEnregistrement: '',
      description: '',
      matricule: '',
      montant: '',
      estimationCourante: '',
      dateInscription: '',
      nomCaution: ''
    };
  }

  cancelEditVehicule(): void {
    this.editingVehiculeId = null;
    this.resetVehicule();
  }

  openEditVehicule(row: { id: string } & typeof this.vehicule): void {
    this.editingVehiculeId = row.id;
    this.vehicule = {
      dossier: row.dossier,
      numeroCompte: row.numeroCompte,
      estimationInitiale: row.estimationInitiale,
      dateEnregistrement: row.dateEnregistrement,
      description: row.description,
      matricule: row.matricule,
      montant: row.montant,
      estimationCourante: row.estimationCourante,
      dateInscription: row.dateInscription,
      nomCaution: row.nomCaution
    };
  }

  removeVehicule(row: { id: string; numeroCompte: string }): void {
    const ok = confirm(`Supprimer le nantissement (Véhicule) du compte ${row.numeroCompte} ?`);
    if (!ok) return;
    this.nantissementsVehicule = this.nantissementsVehicule.filter((n) => n.id !== row.id);
    this.persistVehicule();
    if (this.editingVehiculeId === row.id) {
      this.editingVehiculeId = null;
      this.resetVehicule();
    }
    this.showBanner('Nantissement (Véhicule) supprimé.', 'info');
  }

  filteredFonds(): typeof this.nantissementsFonds {
    const q = this.searchFonds.trim().toLowerCase();
    if (!q) return this.nantissementsFonds;
    return this.nantissementsFonds.filter((n) => {
      return (
        (n.nomDossier || '').toLowerCase().includes(q) ||
        (n.numeroCompte || '').toLowerCase().includes(q) ||
        (n.nomCaution || '').toLowerCase().includes(q)
      );
    });
  }

  filteredVehicule(): typeof this.nantissementsVehicule {
    const q = this.searchVehicule.trim().toLowerCase();
    if (!q) return this.nantissementsVehicule;
    return this.nantissementsVehicule.filter((n) => {
      return (
        (n.dossier || '').toLowerCase().includes(q) ||
        (n.numeroCompte || '').toLowerCase().includes(q) ||
        (n.matricule || '').toLowerCase().includes(q)
      );
    });
  }

  private persistFonds(): void {
    this.storageWrite(this.keyFonds, this.nantissementsFonds);
  }

  private persistVehicule(): void {
    this.storageWrite(this.keyVehicule, this.nantissementsVehicule);
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
