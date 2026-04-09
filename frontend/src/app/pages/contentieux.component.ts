import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth/auth.service';
import { ProfileService } from '../auth/profile.service';
import { ChargeDossierOption, ContentieuxService, ContentieuxStatus, DossierContentieux } from '../contentieux/contentieux.service';
import { CardComponent } from '../theme/shared/components/card/card.component';
import { DossierRisqueService, RisqueCategory, RisqueItem } from '../risque/dossier-risque.service';

type ActionDialogType = 'assign' | 'changeAccount' | 'close' | 'details';

type EngagementPayload = {
  numeroCompte: string;
  titreCreance: string;
  dateContrat: string;
  interetType: '' | 'IC' | 'IR';
  taux: string;
  echeance: string;
  montantRestant: string;
  numRisque: string;
};

type PatrimoinePayload = {
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
};

type GarantiePayload = Record<string, any>;

@Component({
  selector: 'app-contentieux',
  standalone: true,
  imports: [CommonModule, FormsModule, CardComponent],
  templateUrl: './contentieux.component.html',
  styleUrl: './contentieux.component.scss'
})
export class ContentieuxPageComponent implements OnInit {
  statuses: ContentieuxStatus[] = ['A_VALIDER', 'OUVERT', 'AFFECTE', 'CHANGEMENT_COMPTE', 'CLOTURE', 'REOUVERT'];
  activeStatus: ContentieuxStatus | 'Tous' = 'Tous';
  search = '';
  loading = false;
  profileImage: string | undefined = 'assets/images/user/avatar-4.jpg';

  chargeOptions: ChargeDossierOption[] = [];
  chargeOptionsLoading = false;
  agents: string[] = ['Non affecté'];

  banner: { kind: 'success' | 'info' | 'danger'; message: string } | null = null;
  private bannerTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    public auth: AuthService,
    private contentieux: ContentieuxService,
    private profileService: ProfileService,
    private risque: DossierRisqueService
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

    this.load();
    this.loadChargeOptions();
  }

  canValidate(): boolean {
    return this.auth.hasRole('ROLE_RESPONSABLE_CONTENTIEUX') || this.auth.hasRole('ROLE_ADMIN');
  }

  dossiers: DossierContentieux[] = [];

  showForm = false;
  editingId: number | null = null;

  showActionDialog = false;
  actionDialogType: ActionDialogType | null = null;
  selected: DossierContentieux | null = null;

  showRisqueDialog = false;
  risqueStep: 'select' | 'edit' = 'select';
  risqueLoading = false;
  risqueDossierId: number | null = null;
  risqueSelection: {
    engagements: boolean;
    patrimoines: boolean;
    hypotheques: boolean;
    nantissements: boolean;
    cautions: boolean;
  } = {
    engagements: false,
    patrimoines: false,
    hypotheques: false,
    nantissements: false,
    cautions: false
  };

  engagementItems: Array<RisqueItem<EngagementPayload> & { _saving?: boolean; _deleting?: boolean }> = [];
  patrimoineItems: Array<RisqueItem<PatrimoinePayload> & { _saving?: boolean; _deleting?: boolean }> = [];
  hypothequeItems: Array<RisqueItem<GarantiePayload> & { _saving?: boolean; _deleting?: boolean }> = [];
  nantissementItems: Array<RisqueItem<GarantiePayload> & { _saving?: boolean; _deleting?: boolean }> = [];
  cautionItems: Array<RisqueItem<GarantiePayload> & { _saving?: boolean; _deleting?: boolean }> = [];

  editRisquesLoading = false;
  editEngagementItems: Array<RisqueItem<EngagementPayload>> = [];
  editPatrimoineItems: Array<RisqueItem<PatrimoinePayload>> = [];
  editHypothequeItems: Array<RisqueItem<GarantiePayload>> = [];
  editNantissementItems: Array<RisqueItem<GarantiePayload>> = [];
  editCautionItems: Array<RisqueItem<GarantiePayload>> = [];

  newEngagement: EngagementPayload = this.blankEngagement();
  newPatrimoine: PatrimoinePayload = this.blankPatrimoine();
  newHypotheque: GarantiePayload = {};
  newNantissement: GarantiePayload = {};
  newCaution: GarantiePayload = {};

  assignTo = 'Non affecté';
  newCompte = '';
  closeDate = '';
  closeMotif = '';

  form = {
    reference: '',
    objet: '',
    nomDebiteur: '',
    compteActuel: '',
    agence: '',
    chargeDossier: '',
    dateOuverture: '',
    montantEngage: '',
    montantRecupere: '',
    dateCloture: '',
    motifCloture: ''
  };

  load(): void {
    this.loading = true;
    this.contentieux.list().subscribe({
      next: (rows) => {
        this.dossiers = rows;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.showBanner('Erreur lors du chargement des dossiers.', 'danger');
      }
    });
  }

  loadChargeOptions(): void {
    if (this.chargeOptionsLoading) return;
    this.chargeOptionsLoading = true;
    this.contentieux.listChargesDossiers().subscribe({
      next: (rows) => {
        this.chargeOptions = rows || [];
        this.agents = ['Non affecté', ...this.chargeOptions.map((c) => c.label)];
        this.chargeOptionsLoading = false;
      },
      error: () => {
        this.chargeOptionsLoading = false;
      }
    });
  }

  refresh(): void {
    this.load();
  }

  clearSearch(): void {
    this.search = '';
  }

  countAll(): number {
    return this.dossiers.length;
  }

  countByStatus(statut: ContentieuxStatus): number {
    return this.dossiers.filter((d) => d.statut === statut).length;
  }

  countPending(): number {
    return this.countByStatus('A_VALIDER');
  }

  openNew(): void {
    this.editingId = null;
    this.loadChargeOptions();
    this.resetEditRisques();
    this.form = {
      reference: '',
      objet: '',
      nomDebiteur: '',
      compteActuel: '',
      agence: '',
      chargeDossier: '',
      dateOuverture: this.today(),
      montantEngage: '',
      montantRecupere: '',
      dateCloture: '',
      motifCloture: ''
    };
    this.showForm = true;
  }

  openEdit(dossier: DossierContentieux): void {
    if (!this.canValidate()) {
      this.showBanner('Modification réservée au Responsable Contentieux.', 'danger');
      return;
    }
    this.editingId = dossier.id;
    this.loadEditRisques(dossier.id);
    this.form = {
      reference: dossier.reference,
      objet: dossier.objet || '',
      nomDebiteur: dossier.nomDebiteur || '',
      compteActuel: dossier.compteActuel || '',
      agence: dossier.agence || '',
      chargeDossier: dossier.chargeDossier || '',
      dateOuverture: dossier.dateOuverture || '',
      montantEngage: dossier.montantEngage != null ? String(dossier.montantEngage) : '',
      montantRecupere: dossier.montantRecupere != null ? String(dossier.montantRecupere) : '',
      dateCloture: dossier.dateCloture || '',
      motifCloture: dossier.motifCloture || ''
    };
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
    this.resetEditRisques();
  }

  submit(): void {
    const payload = {
      objet: this.form.objet,
      nomDebiteur: this.form.nomDebiteur,
      compteActuel: this.form.compteActuel,
      agence: this.form.agence,
      chargeDossier: this.form.chargeDossier || undefined,
      dateOuverture: this.form.dateOuverture || undefined,
      montantEngage: this.toNumberOrUndefined(this.form.montantEngage),
      montantRecupere: this.toNumberOrUndefined(this.form.montantRecupere)
    };

    if (this.editingId) {
      this.contentieux.update(this.editingId, payload).subscribe({
        next: (updated) => {
          this.dossiers = this.dossiers.map((d) => (d.id === updated.id ? updated : d));
          this.showForm = false;
          this.showBanner('Dossier mis à jour avec succès.', 'success');
        },
        error: () => this.showBanner('Erreur lors de la mise à jour.', 'danger')
      });
      return;
    }

    this.contentieux.create(payload).subscribe({
      next: (created) => {
        this.dossiers = [created, ...this.dossiers];
        this.showForm = false;
        if (created.statut === 'A_VALIDER') {
          this.showBanner('Demande envoyée au Responsable Contentieux.', 'info');
        } else {
          this.showBanner('Nouveau dossier créé avec succès.', 'success');
        }
      },
      error: () => this.showBanner('Erreur lors de la création.', 'danger')
    });
  }

  openDetails(dossier: DossierContentieux): void {
    this.selected = dossier;
    this.openRisqueDialog();
  }

  openAssign(dossier: DossierContentieux): void {
    if (dossier.statut === 'A_VALIDER' && !this.canValidate()) {
      this.showBanner('Affectation impossible avant validation du Responsable Contentieux.', 'danger');
      return;
    }
    this.selected = dossier;
    this.loadChargeOptions();
    this.assignTo = dossier.chargeDossier || 'Non affecté';
    this.actionDialogType = 'assign';
    this.showActionDialog = true;
  }

  openRisqueDialog(): void {
    if (!this.selected) return;
    this.showRisqueDialog = true;
    this.risqueDossierId = this.selected.id;
    this.resetRisqueState();
  }

  onRisqueDossierChange(): void {
    if (!this.risqueDossierId) return;
    this.resetRisqueState();
  }

  closeRisqueDialog(openDetailsAfter?: boolean): void {
    const lastDossierId = this.risqueDossierId;
    const shouldOpenDetailsAfter = openDetailsAfter ?? !this.showForm;
    this.showRisqueDialog = false;
    this.risqueStep = 'select';
    this.risqueLoading = false;
    this.risqueDossierId = null;
    if (this.showForm && this.editingId && lastDossierId && this.editingId === lastDossierId) {
      this.loadEditRisques(this.editingId);
    }
    if (shouldOpenDetailsAfter) {
      this.actionDialogType = 'details';
      this.showActionDialog = true;
    }
  }

  openRisqueForEditing(): void {
    if (!this.editingId) return;
    const dossier = this.dossiers.find((d) => d.id === this.editingId);
    if (!dossier) return;
    this.selected = dossier;
    this.openRisqueDialog();
  }

  dossierLabel(d: DossierContentieux): string {
    const ref = (d.reference ?? '').trim();
    const objet = (d.objet ?? '').trim();
    if (ref && objet) return `${ref} — ${objet}`;
    return ref || `Dossier #${d.id}`;
  }

  risqueDossierRef(): string {
    const d = this.getRisqueDossier();
    return d?.reference || '';
  }

  risqueCompteActuel(): string {
    const d = this.getRisqueDossier();
    return d?.compteActuel || '';
  }

  continueRisque(): void {
    const dossierId = this.risqueDossierId ?? this.selected?.id ?? null;
    if (!dossierId) return;
    const categories: RisqueCategory[] = [];
    if (this.risqueSelection.engagements) categories.push('ENGAGEMENT');
    if (this.risqueSelection.patrimoines) categories.push('PATRIMOINE');
    if (this.risqueSelection.hypotheques) categories.push('GARANTIE_HYPOTHEQUE');
    if (this.risqueSelection.nantissements) categories.push('GARANTIE_NANTISSEMENT');
    if (this.risqueSelection.cautions) categories.push('GARANTIE_CAUTION');

    this.risqueLoading = true;
    const loads = categories.map((cat) => this.risque.list<any>(dossierId, cat));
    if (loads.length === 0) {
      this.risqueLoading = false;
      this.risqueStep = 'edit';
      return;
    }

    let pending = loads.length;
    loads.forEach((obs, idx) => {
      const cat = categories[idx];
      obs.subscribe({
        next: (items) => {
          if (cat === 'ENGAGEMENT') this.engagementItems = items as any;
          if (cat === 'PATRIMOINE') this.patrimoineItems = items as any;
          if (cat === 'GARANTIE_HYPOTHEQUE') this.hypothequeItems = items as any;
          if (cat === 'GARANTIE_NANTISSEMENT') this.nantissementItems = items as any;
          if (cat === 'GARANTIE_CAUTION') this.cautionItems = items as any;
          pending -= 1;
          if (pending === 0) {
            this.risqueLoading = false;
            this.risqueStep = 'edit';
          }
        },
        error: () => {
          pending -= 1;
          if (pending === 0) {
            this.risqueLoading = false;
            this.risqueStep = 'edit';
          }
          this.showBanner('Erreur lors du chargement des données risque.', 'danger');
        }
      });
    });
  }

  addEngagement(): void {
    const dossierId = this.risqueDossierId ?? this.selected?.id ?? null;
    if (!dossierId) return;
    const requiredOk = this.newEngagement.numeroCompte.trim() && this.newEngagement.titreCreance.trim() && this.newEngagement.numRisque.trim();
    if (!requiredOk) {
      this.showBanner('Veuillez renseigner : N° compte, Titre créance et Num risque.', 'danger');
      return;
    }
    const payload: EngagementPayload = {
      numeroCompte: this.newEngagement.numeroCompte.trim(),
      titreCreance: this.newEngagement.titreCreance.trim(),
      dateContrat: this.newEngagement.dateContrat || '',
      interetType: this.newEngagement.interetType,
      taux: this.newEngagement.taux || '',
      echeance: this.newEngagement.echeance || '',
      montantRestant: this.newEngagement.montantRestant || '',
      numRisque: this.newEngagement.numRisque.trim()
    };
    this.risque.create<EngagementPayload>(dossierId, 'ENGAGEMENT', payload).subscribe({
      next: (created) => {
        this.engagementItems = [created as any, ...this.engagementItems];
        if (this.showForm && this.editingId && this.editingId === dossierId) {
          this.editEngagementItems = [created as any, ...this.editEngagementItems];
        }
        this.newEngagement = this.blankEngagement();
        this.showBanner('Engagement enregistré.', 'success');
      },
      error: () => this.showBanner('Erreur lors de l’enregistrement de l’engagement.', 'danger')
    });
  }

  saveEngagement(item: RisqueItem<EngagementPayload> & { _saving?: boolean }): void {
    const dossierId = this.risqueDossierId ?? this.selected?.id ?? null;
    if (!dossierId) return;
    item._saving = true;
    this.risque.update<EngagementPayload>(dossierId, 'ENGAGEMENT', item.id, item.payload).subscribe({
      next: (updated) => {
        this.engagementItems = this.engagementItems.map((e) => (e.id === updated.id ? ({ ...updated } as any) : e));
        item._saving = false;
        this.showBanner('Engagement mis à jour.', 'success');
      },
      error: () => {
        item._saving = false;
        this.showBanner('Erreur lors de la mise à jour de l’engagement.', 'danger');
      }
    });
  }

  removeEngagement(item: RisqueItem<EngagementPayload> & { _deleting?: boolean }): void {
    const dossierId = this.risqueDossierId ?? this.selected?.id ?? null;
    if (!dossierId) return;
    const ok = confirm(`Supprimer l’engagement du compte ${item.payload.numeroCompte} ?`);
    if (!ok) return;
    item._deleting = true;
    this.risque.delete(dossierId, 'ENGAGEMENT', item.id).subscribe({
      next: () => {
        this.engagementItems = this.engagementItems.filter((e) => e.id !== item.id);
        this.showBanner('Engagement supprimé.', 'info');
      },
      error: () => {
        item._deleting = false;
        this.showBanner('Erreur lors de la suppression de l’engagement.', 'danger');
      }
    });
  }

  addPatrimoine(): void {
    const dossierId = this.risqueDossierId ?? this.selected?.id ?? null;
    if (!dossierId) return;
    const requiredOk = this.newPatrimoine.nom.trim() && this.newPatrimoine.prenom.trim();
    if (!requiredOk) {
      this.showBanner('Veuillez renseigner : Nom et Prénom.', 'danger');
      return;
    }
    const payload: PatrimoinePayload = {
      nom: this.newPatrimoine.nom.trim(),
      prenom: this.newPatrimoine.prenom.trim(),
      dateNaissance: this.newPatrimoine.dateNaissance || '',
      numeroDossier: this.risqueDossierRef(),
      biensImmobiliers: this.newPatrimoine.biensImmobiliers || '',
      comptesBancaires: this.newPatrimoine.comptesBancaires || '',
      investissementsActions: this.newPatrimoine.investissementsActions || '',
      creditsPrets: this.newPatrimoine.creditsPrets || '',
      autresDettes: this.newPatrimoine.autresDettes || '',
      dettesFiscalesPenalites: this.newPatrimoine.dettesFiscalesPenalites || ''
    };
    this.risque.create<PatrimoinePayload>(dossierId, 'PATRIMOINE', payload).subscribe({
      next: (created) => {
        this.patrimoineItems = [created as any, ...this.patrimoineItems];
        if (this.showForm && this.editingId && this.editingId === dossierId) {
          this.editPatrimoineItems = [created as any, ...this.editPatrimoineItems];
        }
        this.newPatrimoine = this.blankPatrimoine();
        this.showBanner('Patrimoine enregistré.', 'success');
      },
      error: () => this.showBanner('Erreur lors de l’enregistrement du patrimoine.', 'danger')
    });
  }

  savePatrimoine(item: RisqueItem<PatrimoinePayload> & { _saving?: boolean }): void {
    const dossierId = this.risqueDossierId ?? this.selected?.id ?? null;
    if (!dossierId) return;
    item._saving = true;
    this.risque.update<PatrimoinePayload>(dossierId, 'PATRIMOINE', item.id, item.payload).subscribe({
      next: (updated) => {
        this.patrimoineItems = this.patrimoineItems.map((p) => (p.id === updated.id ? ({ ...updated } as any) : p));
        item._saving = false;
        this.showBanner('Patrimoine mis à jour.', 'success');
      },
      error: () => {
        item._saving = false;
        this.showBanner('Erreur lors de la mise à jour du patrimoine.', 'danger');
      }
    });
  }

  removePatrimoine(item: RisqueItem<PatrimoinePayload> & { _deleting?: boolean }): void {
    const dossierId = this.risqueDossierId ?? this.selected?.id ?? null;
    if (!dossierId) return;
    const ok = confirm(`Supprimer le patrimoine de ${item.payload.nom} ${item.payload.prenom} ?`);
    if (!ok) return;
    item._deleting = true;
    this.risque.delete(dossierId, 'PATRIMOINE', item.id).subscribe({
      next: () => {
        this.patrimoineItems = this.patrimoineItems.filter((p) => p.id !== item.id);
        this.showBanner('Patrimoine supprimé.', 'info');
      },
      error: () => {
        item._deleting = false;
        this.showBanner('Erreur lors de la suppression du patrimoine.', 'danger');
      }
    });
  }

  addGarantie(category: RisqueCategory): void {
    const dossierId = this.risqueDossierId ?? this.selected?.id ?? null;
    if (!dossierId) return;
    const payload = this.sanitizeGarantiePayload(category);
    this.risque.create<GarantiePayload>(dossierId, category, payload).subscribe({
      next: (created) => {
        if (category === 'GARANTIE_HYPOTHEQUE') this.hypothequeItems = [created as any, ...this.hypothequeItems];
        if (category === 'GARANTIE_NANTISSEMENT') this.nantissementItems = [created as any, ...this.nantissementItems];
        if (category === 'GARANTIE_CAUTION') this.cautionItems = [created as any, ...this.cautionItems];
        if (this.showForm && this.editingId && this.editingId === dossierId) {
          if (category === 'GARANTIE_HYPOTHEQUE') this.editHypothequeItems = [created as any, ...this.editHypothequeItems];
          if (category === 'GARANTIE_NANTISSEMENT') this.editNantissementItems = [created as any, ...this.editNantissementItems];
          if (category === 'GARANTIE_CAUTION') this.editCautionItems = [created as any, ...this.editCautionItems];
        }
        if (category === 'GARANTIE_HYPOTHEQUE') this.newHypotheque = this.blankHypotheque();
        if (category === 'GARANTIE_NANTISSEMENT') this.newNantissement = this.blankNantissement();
        if (category === 'GARANTIE_CAUTION') this.newCaution = this.blankCaution();
        this.showBanner('Garantie enregistrée.', 'success');
      },
      error: () => this.showBanner('Erreur lors de l’enregistrement de la garantie.', 'danger')
    });
  }

  private loadEditRisques(dossierId: number): void {
    this.editRisquesLoading = true;
    let pending = 5;
    const done = () => {
      pending -= 1;
      if (pending <= 0) this.editRisquesLoading = false;
    };

    this.risque.list<EngagementPayload>(dossierId, 'ENGAGEMENT').subscribe({
      next: (items) => {
        this.editEngagementItems = items || [];
        done();
      },
      error: () => done()
    });
    this.risque.list<PatrimoinePayload>(dossierId, 'PATRIMOINE').subscribe({
      next: (items) => {
        this.editPatrimoineItems = items || [];
        done();
      },
      error: () => done()
    });
    this.risque.list<GarantiePayload>(dossierId, 'GARANTIE_HYPOTHEQUE').subscribe({
      next: (items) => {
        this.editHypothequeItems = items || [];
        done();
      },
      error: () => done()
    });
    this.risque.list<GarantiePayload>(dossierId, 'GARANTIE_NANTISSEMENT').subscribe({
      next: (items) => {
        this.editNantissementItems = items || [];
        done();
      },
      error: () => done()
    });
    this.risque.list<GarantiePayload>(dossierId, 'GARANTIE_CAUTION').subscribe({
      next: (items) => {
        this.editCautionItems = items || [];
        done();
      },
      error: () => done()
    });
  }

  private resetEditRisques(): void {
    this.editRisquesLoading = false;
    this.editEngagementItems = [];
    this.editPatrimoineItems = [];
    this.editHypothequeItems = [];
    this.editNantissementItems = [];
    this.editCautionItems = [];
  }

  saveGarantie(category: RisqueCategory, item: RisqueItem<GarantiePayload> & { _saving?: boolean }): void {
    const dossierId = this.risqueDossierId ?? this.selected?.id ?? null;
    if (!dossierId) return;
    item._saving = true;
    this.risque.update<GarantiePayload>(dossierId, category, item.id, item.payload).subscribe({
      next: (updated) => {
        if (category === 'GARANTIE_HYPOTHEQUE') this.hypothequeItems = this.hypothequeItems.map((h) => (h.id === updated.id ? (updated as any) : h));
        if (category === 'GARANTIE_NANTISSEMENT') this.nantissementItems = this.nantissementItems.map((n) => (n.id === updated.id ? (updated as any) : n));
        if (category === 'GARANTIE_CAUTION') this.cautionItems = this.cautionItems.map((c) => (c.id === updated.id ? (updated as any) : c));
        item._saving = false;
        this.showBanner('Garantie mise à jour.', 'success');
      },
      error: () => {
        item._saving = false;
        this.showBanner('Erreur lors de la mise à jour de la garantie.', 'danger');
      }
    });
  }

  removeGarantie(category: RisqueCategory, item: RisqueItem<GarantiePayload> & { _deleting?: boolean }): void {
    const dossierId = this.risqueDossierId ?? this.selected?.id ?? null;
    if (!dossierId) return;
    const ok = confirm('Supprimer cette garantie ?');
    if (!ok) return;
    item._deleting = true;
    this.risque.delete(dossierId, category, item.id).subscribe({
      next: () => {
        if (category === 'GARANTIE_HYPOTHEQUE') this.hypothequeItems = this.hypothequeItems.filter((h) => h.id !== item.id);
        if (category === 'GARANTIE_NANTISSEMENT') this.nantissementItems = this.nantissementItems.filter((n) => n.id !== item.id);
        if (category === 'GARANTIE_CAUTION') this.cautionItems = this.cautionItems.filter((c) => c.id !== item.id);
        this.showBanner('Garantie supprimée.', 'info');
      },
      error: () => {
        item._deleting = false;
        this.showBanner('Erreur lors de la suppression de la garantie.', 'danger');
      }
    });
  }

  private blankEngagement(): EngagementPayload {
    return {
      numeroCompte: this.risqueCompteActuel(),
      titreCreance: '',
      dateContrat: '',
      interetType: '',
      taux: '',
      echeance: '',
      montantRestant: '',
      numRisque: ''
    };
  }

  private blankPatrimoine(): PatrimoinePayload {
    return {
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

  private blankHypotheque(): GarantiePayload {
    return {
      dossier: this.risqueDossierRef(),
      numeroCompte: this.risqueCompteActuel(),
      montant: '',
      typeBien: '',
      adresse: ''
    };
  }

  private blankNantissement(): GarantiePayload {
    return {
      dossier: this.risqueDossierRef(),
      numeroCompte: this.risqueCompteActuel(),
      description: '',
      montant: ''
    };
  }

  private blankCaution(): GarantiePayload {
    return {
      numeroDossier: this.risqueDossierRef(),
      numeroCompte: this.risqueCompteActuel(),
      description: '',
      montantLimite: ''
    };
  }

  private resetRisqueState(): void {
    this.risqueStep = 'select';
    this.risqueLoading = false;
    this.risqueSelection = {
      engagements: false,
      patrimoines: false,
      hypotheques: false,
      nantissements: false,
      cautions: false
    };
    this.engagementItems = [];
    this.patrimoineItems = [];
    this.hypothequeItems = [];
    this.nantissementItems = [];
    this.cautionItems = [];
    this.newEngagement = this.blankEngagement();
    this.newPatrimoine = this.blankPatrimoine();
    this.newHypotheque = this.blankHypotheque();
    this.newNantissement = this.blankNantissement();
    this.newCaution = this.blankCaution();
  }

  private getRisqueDossier(): DossierContentieux | null {
    const id = this.risqueDossierId ?? this.selected?.id ?? null;
    if (!id) return null;
    const fromList = this.dossiers.find((d) => d.id === id);
    return fromList || this.selected || null;
  }

  private sanitizeGarantiePayload(category: RisqueCategory): GarantiePayload {
    if (category === 'GARANTIE_HYPOTHEQUE') return { ...this.newHypotheque };
    if (category === 'GARANTIE_NANTISSEMENT') return { ...this.newNantissement };
    return { ...this.newCaution };
  }

  confirmAssign(): void {
    if (!this.selected) return;
    this.contentieux.assign(this.selected.id, this.assignTo).subscribe({
      next: (updated) => {
        this.dossiers = this.dossiers.map((d) => (d.id === updated.id ? updated : d));
        this.showBanner('Affectation enregistrée.', 'success');
        this.closeActionDialog();
      },
      error: () => this.showBanner('Erreur lors de l’affectation.', 'danger')
    });
  }

  openChangeAccount(dossier: DossierContentieux): void {
    if (dossier.statut === 'A_VALIDER' && !this.canValidate()) {
      this.showBanner('Changement de compte impossible avant validation du Responsable Contentieux.', 'danger');
      return;
    }
    this.selected = dossier;
    this.newCompte = '';
    this.actionDialogType = 'changeAccount';
    this.showActionDialog = true;
  }

  confirmChangeAccount(): void {
    if (!this.selected) return;
    const value = this.newCompte.trim();
    if (!value) return;
    this.contentieux.changeAccount(this.selected.id, value).subscribe({
      next: (updated) => {
        this.dossiers = this.dossiers.map((d) => (d.id === updated.id ? updated : d));
        this.showBanner('Compte modifié.', 'success');
        this.closeActionDialog();
      },
      error: () => this.showBanner('Erreur lors du changement de compte.', 'danger')
    });
  }

  openClose(dossier: DossierContentieux): void {
    if (dossier.statut === 'A_VALIDER') {
      this.showBanner('Clôture impossible avant validation.', 'danger');
      return;
    }
    this.selected = dossier;
    this.closeDate = this.today();
    this.closeMotif = '';
    this.actionDialogType = 'close';
    this.showActionDialog = true;
  }

  confirmClose(): void {
    if (!this.selected) return;
    this.contentieux
      .close(this.selected.id, { dateCloture: this.closeDate || undefined, motifCloture: this.closeMotif || undefined })
      .subscribe({
        next: (updated) => {
          this.dossiers = this.dossiers.map((d) => (d.id === updated.id ? updated : d));
          this.showBanner('Dossier clôturé.', 'success');
          this.closeActionDialog();
        },
        error: () => this.showBanner('Erreur lors de la clôture.', 'danger')
      });
  }

  reopen(dossier: DossierContentieux): void {
    this.contentieux.reopen(dossier.id).subscribe({
      next: (updated) => {
        this.dossiers = this.dossiers.map((d) => (d.id === updated.id ? updated : d));
        this.showBanner('Dossier réouvert.', 'success');
      },
      error: () => this.showBanner('Erreur lors de la réouverture.', 'danger')
    });
  }

  validateOpening(dossier: DossierContentieux): void {
    if (!this.canValidate()) return;
    this.contentieux.validate(dossier.id).subscribe({
      next: (updated) => {
        this.dossiers = this.dossiers.map((d) => (d.id === updated.id ? updated : d));
        this.showBanner('Dossier validé et ouvert.', 'success');
      },
      error: () => this.showBanner('Erreur lors de la validation.', 'danger')
    });
  }

  remove(dossier: DossierContentieux): void {
    const ok = confirm(`Supprimer le dossier ${dossier.reference} ?`);
    if (!ok) return;
    this.contentieux.remove(dossier.id).subscribe({
      next: () => {
        this.dossiers = this.dossiers.filter((d) => d.id !== dossier.id);
        this.showBanner('Dossier supprimé.', 'info');
      },
      error: () => this.showBanner('Erreur lors de la suppression.', 'danger')
    });
  }

  closeActionDialog(): void {
    this.showActionDialog = false;
    this.actionDialogType = null;
    this.selected = null;
  }

  filteredDossiers(): DossierContentieux[] {
    const q = this.search.trim().toLowerCase();
    return this.dossiers.filter((d) => {
      if (this.activeStatus !== 'Tous' && d.statut !== this.activeStatus) return false;
      if (!q) return true;
      return (
        (d.reference || '').toLowerCase().includes(q) ||
        (d.objet || '').toLowerCase().includes(q) ||
        (d.nomDebiteur || '').toLowerCase().includes(q) ||
        (d.compteActuel || '').toLowerCase().includes(q) ||
        (d.agence || '').toLowerCase().includes(q) ||
        (d.chargeDossier || '').toLowerCase().includes(q)
      );
    });
  }

  filteredCount(): number {
    return this.filteredDossiers().length;
  }

  badgeClass(statut: ContentieuxStatus): string {
    if (statut === 'A_VALIDER') return 'badge bg-warning-subtle text-warning';
    if (statut === 'OUVERT') return 'badge bg-success-subtle text-success';
    if (statut === 'AFFECTE') return 'badge bg-primary-subtle text-primary';
    if (statut === 'CHANGEMENT_COMPTE') return 'badge bg-info-subtle text-info';
    if (statut === 'REOUVERT') return 'badge bg-success-subtle text-success';
    return 'badge bg-secondary-subtle text-secondary';
  }

  private showBanner(message: string, kind: 'success' | 'info' | 'danger' = 'success'): void {
    this.banner = { kind, message };
    if (this.bannerTimer) clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => {
      this.banner = null;
      this.bannerTimer = null;
    }, 2500);
  }

  private today(deltaDays = 0): string {
    const d = new Date();
    d.setDate(d.getDate() + deltaDays);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private now(deltaDays = 0): string {
    const d = new Date();
    d.setDate(d.getDate() + deltaDays);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
  }

  statusLabel(statut: ContentieuxStatus): string {
    if (statut === 'A_VALIDER') return 'En attente validation';
    if (statut === 'OUVERT') return 'Ouvert';
    if (statut === 'AFFECTE') return 'Affecté';
    if (statut === 'CHANGEMENT_COMPTE') return 'Changement de compte';
    if (statut === 'REOUVERT') return 'Réouvert';
    return 'Clôturé';
  }

  private toNumberOrUndefined(value: string): number | undefined {
    const v = value.trim();
    if (!v) return undefined;
    const n = Number(v.replace(',', '.'));
    if (!Number.isFinite(n)) return undefined;
    return n;
  }
}
