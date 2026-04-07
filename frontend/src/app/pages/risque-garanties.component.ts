import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CardComponent } from '../theme/shared/components/card/card.component';

@Component({
  selector: 'app-risque-garanties',
  standalone: true,
  imports: [CommonModule, FormsModule, CardComponent],
  templateUrl: './risque-garanties.component.html',
  styleUrl: './risque-garanties.component.scss'
})
export class RisqueGarantiesPageComponent implements OnInit {
  private readonly keyFonds = 'pfe.risque.garanties.nantissementsFonds.v1';
  private readonly keyVehicule = 'pfe.risque.garanties.nantissementsVehicule.v1';
  private readonly keyHypotheque = 'pfe.risque.garanties.hypotheques.v1';
  private readonly keyCautions = 'pfe.risque.garanties.cautions.v1';

  activeType: 'fonds' | 'vehicule' = 'fonds';
  activeSection: 'nantissement' | 'hypotheque' | 'cautions' = 'nantissement';

  banner: { kind: 'success' | 'info' | 'danger'; message: string } | null = null;
  private bannerTimer: ReturnType<typeof setTimeout> | null = null;

  searchFonds = '';
  searchVehicule = '';
  searchHypotheque = '';
  searchCautions = '';

  editingFondsId: string | null = null;
  editingVehiculeId: string | null = null;
  editingHypothequeId: string | null = null;
  editingCautionId: string | null = null;

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

  caution = {
    numeroDossier: '',
    description: '',
    numeroGarant: '',
    numeroCompte: '',
    natureCaution: '',
    dateContrat: '',
    montantLimite: '',
    typeDocumentCaution: '',
    numeroDocument: ''
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

  cautions: Array<{
    id: string;
    createdAt: string;
    numeroDossier: string;
    description: string;
    numeroGarant: string;
    numeroCompte: string;
    natureCaution: string;
    dateContrat: string;
    montantLimite: string;
    typeDocumentCaution: string;
    numeroDocument: string;
  }> = [];

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.nantissementsFonds = this.storageRead(this.keyFonds, []);
    this.nantissementsVehicule = this.storageRead(this.keyVehicule, []);
    this.hypotheques = this.storageRead(this.keyHypotheque, []);
    this.cautions = this.storageRead(this.keyCautions, []);

    const section = this.route.snapshot.queryParamMap.get('section');
    if (section === 'nantissement' || section === 'hypotheque' || section === 'cautions') {
      this.openSection(section);
    }
  }

  openSection(section: 'nantissement' | 'hypotheque' | 'cautions'): void {
    this.activeSection = section;
    const id =
      section === 'nantissement' ? 'section-nantissement' : section === 'hypotheque' ? 'section-hypotheque' : 'section-caution';
    setTimeout(() => this.scrollTo(id), 0);
  }

  scrollTo(sectionId: string): void {
    try {
      const el = document.getElementById(sectionId);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch {
      return;
    }
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

  saveHypotheque(): void {
    const ok = this.hypotheque.dossier.trim() && this.hypotheque.numeroCompte.trim();
    if (!ok) {
      this.showBanner('Veuillez renseigner : Dossier et N° compte.', 'danger');
      return;
    }
    if (this.editingHypothequeId) {
      this.hypotheques = this.hypotheques.map((h) =>
        h.id === this.editingHypothequeId ? { ...h, ...this.hypotheque } : h
      );
      this.persistHypotheque();
      this.editingHypothequeId = null;
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
    this.persistHypotheque();
    this.showBanner('Hypothèque enregistrée.', 'success');
  }

  resetHypotheque(): void {
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

  cancelEditHypotheque(): void {
    this.editingHypothequeId = null;
    this.resetHypotheque();
  }

  openEditHypotheque(row: { id: string } & typeof this.hypotheque): void {
    this.editingHypothequeId = row.id;
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

  removeHypotheque(row: { id: string; numeroCompte: string }): void {
    const ok = confirm(`Supprimer l’hypothèque du compte ${row.numeroCompte} ?`);
    if (!ok) return;
    this.hypotheques = this.hypotheques.filter((h) => h.id !== row.id);
    this.persistHypotheque();
    if (this.editingHypothequeId === row.id) {
      this.editingHypothequeId = null;
      this.resetHypotheque();
    }
    this.showBanner('Hypothèque supprimée.', 'info');
  }

  saveCaution(): void {
    const ok = this.caution.numeroDossier.trim() && this.caution.numeroCompte.trim();
    if (!ok) {
      this.showBanner('Veuillez renseigner : N° Dossier et N° compte.', 'danger');
      return;
    }

    const payload = {
      numeroDossier: this.caution.numeroDossier.trim(),
      description: this.caution.description || '',
      numeroGarant: this.caution.numeroGarant || '',
      numeroCompte: this.caution.numeroCompte.trim(),
      natureCaution: this.caution.natureCaution || '',
      dateContrat: this.caution.dateContrat || '',
      montantLimite: this.caution.montantLimite || '',
      typeDocumentCaution: this.caution.typeDocumentCaution || '',
      numeroDocument: this.caution.numeroDocument || ''
    };

    if (this.editingCautionId) {
      this.cautions = this.cautions.map((c) => (c.id === this.editingCautionId ? { ...c, ...payload } : c));
      this.persistCautions();
      this.editingCautionId = null;
      this.showBanner('Caution mise à jour.', 'success');
      return;
    }

    this.cautions = [
      {
        id: this.newId(),
        createdAt: this.now(),
        ...payload
      },
      ...this.cautions
    ];
    this.persistCautions();
    this.showBanner('Caution enregistrée.', 'success');
  }

  resetCaution(): void {
    this.caution = {
      numeroDossier: '',
      description: '',
      numeroGarant: '',
      numeroCompte: '',
      natureCaution: '',
      dateContrat: '',
      montantLimite: '',
      typeDocumentCaution: '',
      numeroDocument: ''
    };
  }

  cancelEditCaution(): void {
    this.editingCautionId = null;
    this.resetCaution();
  }

  openEditCaution(row: { id: string } & typeof this.caution): void {
    this.editingCautionId = row.id;
    this.caution = {
      numeroDossier: row.numeroDossier,
      description: row.description,
      numeroGarant: row.numeroGarant,
      numeroCompte: row.numeroCompte,
      natureCaution: row.natureCaution,
      dateContrat: row.dateContrat,
      montantLimite: row.montantLimite,
      typeDocumentCaution: row.typeDocumentCaution,
      numeroDocument: row.numeroDocument
    };
  }

  removeCaution(row: { id: string; numeroDossier: string; numeroCompte: string }): void {
    const ok = confirm(`Supprimer la caution (dossier ${row.numeroDossier}, compte ${row.numeroCompte}) ?`);
    if (!ok) return;
    this.cautions = this.cautions.filter((c) => c.id !== row.id);
    this.persistCautions();
    if (this.editingCautionId === row.id) {
      this.editingCautionId = null;
      this.resetCaution();
    }
    this.showBanner('Caution supprimée.', 'info');
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

  filteredHypotheques(): typeof this.hypotheques {
    const q = this.searchHypotheque.trim().toLowerCase();
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

  filteredCautions(): typeof this.cautions {
    const q = this.searchCautions.trim().toLowerCase();
    if (!q) return this.cautions;
    return this.cautions.filter((c) => {
      return (
        (c.numeroDossier || '').toLowerCase().includes(q) ||
        (c.numeroCompte || '').toLowerCase().includes(q) ||
        (c.numeroGarant || '').toLowerCase().includes(q) ||
        (c.natureCaution || '').toLowerCase().includes(q)
      );
    });
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

  private persistFonds(): void {
    this.storageWrite(this.keyFonds, this.nantissementsFonds);
  }

  private persistVehicule(): void {
    this.storageWrite(this.keyVehicule, this.nantissementsVehicule);
  }

  private persistHypotheque(): void {
    this.storageWrite(this.keyHypotheque, this.hypotheques);
  }

  private persistCautions(): void {
    this.storageWrite(this.keyCautions, this.cautions);
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

  private showBanner(message: string, kind: 'success' | 'info' | 'danger'): void {
    this.banner = { kind, message };
    if (this.bannerTimer) clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => {
      this.banner = null;
      this.bannerTimer = null;
    }, 2500);
  }
}
