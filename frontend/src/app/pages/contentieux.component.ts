import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { AffaireContentieux, AffaireStatut, ChargeDossierOption, ContentieuxService, ContentieuxStatus, CreateAffaireRequest, DossierContentieux, DossierDetailsResponse, RelanceDto, RelanceRequest, RelanceStatut, RelanceType, UrgencePredictionResponse } from '../contentieux/contentieux.service';
import { ProfileService } from '../auth/profile.service';
import { CardComponent } from '../theme/shared/components/card/card.component';
import { DossierRisqueService, RisqueCategory, RisqueItem } from '../risque/dossier-risque.service';
import { AosService } from '../aos/aos.service';

type ActionDialogType = 'assign' | 'changeAccount' | 'close' | 'reject' | 'details' | 'relances';

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
export class ContentieuxPageComponent implements OnInit, OnDestroy {
  statuses: ContentieuxStatus[] = ['A_VALIDER', 'REJETE', 'OUVERT', 'AFFECTE', 'CHANGEMENT_COMPTE', 'CLOTURE', 'REOUVERT'];
  activeStatus: ContentieuxStatus | 'Tous' = 'Tous';
  search = '';
  loading = false;
  profileImage: string | undefined = 'assets/images/user/avatar-4.jpg';
  currentUserId: number | null = null;

  chargeOptions: ChargeDossierOption[] = [];
  chargeOptionsLoading = false;

  banner: { kind: 'success' | 'info' | 'danger'; message: string } | null = null;
  private bannerTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    public auth: AuthService,
    private contentieux: ContentieuxService,
    private profileService: ProfileService,
    private risque: DossierRisqueService,
    private aos: AosService
  ) {}

  ngOnInit(): void {
    this.profileService.profile$.subscribe(profile => {
      if (profile && profile.profileImage) {
        this.profileImage = profile.profileImage;
      } else {
        this.profileImage = 'assets/images/user/avatar-4.jpg';
      }
      this.currentUserId = profile?.id ?? null;
    });

    if (this.auth.token()) {
      this.profileService.getProfile().subscribe();
    }

    this.load();
    this.loadChargeOptions();
  }

  ngOnDestroy(): void {
    this.setBodyScrollLocked(false);
  }

  canValidate(): boolean {
    return this.auth.hasRole('ROLE_RESPONSABLE_CONTENTIEUX') || this.auth.hasRole('ROLE_ADMIN');
  }

  canAssign(): boolean {
    return this.auth.hasRole('ROLE_RESPONSABLE_CONTENTIEUX') || this.auth.hasRole('ROLE_ADMIN');
  }

  canDelete(): boolean {
    return this.auth.hasRole('ROLE_ADMIN');
  }

  canReopen(): boolean {
    return this.auth.hasRole('ROLE_RESPONSABLE_CONTENTIEUX') || this.auth.hasRole('ROLE_ADMIN');
  }

  isResponsableContentieux(): boolean {
    return this.auth.hasRole('ROLE_RESPONSABLE_CONTENTIEUX');
  }

  canEditRelances(): boolean {
    return this.auth.hasRole('ROLE_RESPONSABLE_CONTENTIEUX') || this.auth.hasRole('ROLE_CHARGE_DOSSIER') || this.auth.hasRole('ROLE_ADMIN');
  }

  dossiers: DossierContentieux[] = [];

  showForm = false;
  editingId: number | null = null;

  showActionDialog = false;
  actionDialogType: ActionDialogType | null = null;
  selected: DossierContentieux | null = null;

  affaires: AffaireContentieux[] = [];
  affairesLoading = false;
  showAffaireDialog = false;
  affaireSaving = false;
  dossierDetails: DossierDetailsResponse | null = null;
  dossierDetailsLoading = false;
  mlForm: { retardJours: number | null; montant: string; nbRelances: number | null } = {
    retardJours: null,
    montant: '',
    nbRelances: null
  };
  mlFormTouched = false;
  mlPrediction: UrgencePredictionResponse | null = null;
  mlPredictLoading = false;
  relances: RelanceDto[] = [];
  relancesLoading = false;
  relanceSaving = false;
  relanceEditingId: number | null = null;
  relanceForm: RelanceRequest = {
    dateRelance: '',
    typeRelance: 'EMAIL',
    statut: 'ENVOYEE'
  };
  relanceTypeOptions: Array<{ value: RelanceType; label: string }> = [
    { value: 'EMAIL', label: 'Email' },
    { value: 'TELEPHONE', label: 'Téléphone' },
    { value: 'COURRIER', label: 'Courrier' },
    { value: 'AUTRE', label: 'Autre' }
  ];
  relanceStatutOptions: Array<{ value: RelanceStatut; label: string }> = [
    { value: 'ENVOYEE', label: 'Envoyée' },
    { value: 'EN_ATTENTE', label: 'En attente' },
    { value: 'REPONSE_RECUE', label: 'Réponse reçue' }
  ];
  detailRisqueLoading = false;
  detailRisqueSaving = false;
  detailRisqueSelection: {
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
  detailRisqueCounts = {
    engagements: 0,
    patrimoines: 0,
    hypotheques: 0,
    nantissements: 0,
    cautions: 0
  };
  affaireForm: CreateAffaireRequest = {
    typeAffaire: '',
    description: '',
    statut: 'EN_COURS',
    dateCreation: ''
  };
  typeAffaireOptions: string[] = [
    'Recouvrement de créance',
    'Litige bancaire',
    'Saisie',
    'Exécution de jugement',
    'Assignation',
    'Appel',
    'Opposition',
    'Contentieux commercial',
    'Contentieux civil',
    'Contentieux pénal',
    'Règlement amiable'
  ];
  affaireStatuts: Array<{ value: AffaireStatut; label: string }> = [
    { value: 'EN_COURS', label: 'en_cours' },
    { value: 'TERMINEE', label: 'terminee' },
    { value: 'EN_ATTENTE', label: 'en_attente' }
  ];

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

  assignToId: number | null = null;
  newCompte = '';
  closeDate = '';
  closeMotif = '';
  rejectMotif = '';
  rejectSaving = false;

  form = {
    reference: '',
    objet: '',
    nomDebiteur: '',
    compteActuel: '',
    agence: '',
    chargeDossierId: null as number | null,
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
        setTimeout(() => this.aos.refresh(), 0);
      },
      error: () => {
        this.loading = false;
        this.showBanner('Erreur lors du chargement des dossiers.', 'danger');
        setTimeout(() => this.aos.refresh(), 0);
      }
    });
  }

  loadChargeOptions(): void {
    if (this.chargeOptionsLoading) return;
    this.chargeOptionsLoading = true;
    this.contentieux.listChargesDossiers().subscribe({
      next: (rows) => {
        this.chargeOptions = rows || [];
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
      chargeDossierId: this.auth.hasRole('ROLE_CHARGE_DOSSIER') ? this.currentUserId : null,
      dateOuverture: this.today(),
      montantEngage: '',
      montantRecupere: '',
      dateCloture: '',
      motifCloture: ''
    };
    this.showForm = true;
    this.setBodyScrollLocked(true);
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
      chargeDossierId: dossier.chargeDossierId ?? null,
      dateOuverture: dossier.dateOuverture || '',
      montantEngage: dossier.montantEngage != null ? String(dossier.montantEngage) : '',
      montantRecupere: dossier.montantRecupere != null ? String(dossier.montantRecupere) : '',
      dateCloture: dossier.dateCloture || '',
      motifCloture: dossier.motifCloture || ''
    };
    this.showForm = true;
    this.setBodyScrollLocked(true);
  }

  closeForm(): void {
    this.showForm = false;
    this.resetEditRisques();
    this.setBodyScrollLocked(false);
  }

  submit(): void {
    const montantEngage = this.toDecimalStringOrUndefined(this.form.montantEngage);
    const montantRecupere = this.toDecimalStringOrUndefined(this.form.montantRecupere);

    if ((this.form.montantEngage ?? '').trim() && montantEngage === undefined) {
      this.showBanner('Montant total engagé invalide. Exemple: 400000 ou 400000.00 ou 400000,00', 'danger');
      return;
    }
    if ((this.form.montantRecupere ?? '').trim() && montantRecupere === undefined) {
      this.showBanner('Montant récupéré invalide. Exemple: 10000 ou 10000.00 ou 10000,00', 'danger');
      return;
    }

    const payload = {
      objet: this.form.objet,
      nomDebiteur: this.form.nomDebiteur,
      compteActuel: this.form.compteActuel,
      agence: this.form.agence,
      chargeDossierId: this.form.chargeDossierId ?? undefined,
      dateOuverture: this.form.dateOuverture || undefined,
      montantEngage,
      montantRecupere
    };

    if (this.editingId) {
      this.contentieux.update(this.editingId, payload).subscribe({
        next: (updated) => {
          this.dossiers = this.dossiers.map((d) => (d.id === updated.id ? updated : d));
          this.showForm = false;
          this.setBodyScrollLocked(false);
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
        this.setBodyScrollLocked(false);
        if (created.statut === 'A_VALIDER') {
          this.showBanner('Demande envoyée au Responsable Contentieux.', 'info');
        } else {
          this.showBanner('Nouveau dossier créé avec succès.', 'success');
        }
      },
      error: () => this.showBanner('Erreur lors de la création.', 'danger')
    });
  }

  private setBodyScrollLocked(locked: boolean): void {
    const cls = 'app-lock-scroll';
    const body = document?.body;
    if (!body) return;
    if (locked) body.classList.add(cls);
    else body.classList.remove(cls);
  }

  private syncBodyScrollLock(): void {
    const locked = this.showForm || this.showActionDialog || this.showAffaireDialog || this.showRisqueDialog;
    this.setBodyScrollLocked(locked);
  }

  openDetails(dossier: DossierContentieux): void {
    this.selected = dossier;
    this.actionDialogType = 'details';
    this.showActionDialog = true;
    this.syncBodyScrollLock();
    this.loadDossierDetails();
  }

  openAssign(dossier: DossierContentieux): void {
    if (dossier.statut === 'A_VALIDER' && !this.canValidate()) {
      this.showBanner('Affectation impossible avant validation du Responsable Contentieux.', 'danger');
      return;
    }
    this.selected = dossier;
    this.loadChargeOptions();
    this.assignToId = dossier.chargeDossierId ?? null;
    this.actionDialogType = 'assign';
    this.showActionDialog = true;
    this.syncBodyScrollLock();
  }

  openRisqueDialog(): void {
    if (!this.selected) return;
    this.showRisqueDialog = true;
    this.risqueDossierId = this.selected.id;
    this.risqueSelection = { ...this.detailRisqueSelection };
    this.resetRisqueEditorState();
    this.syncBodyScrollLock();
  }

  onRisqueDossierChange(): void {
    if (!this.risqueDossierId) return;
    this.resetRisqueState();
  }

  closeRisqueDialog(openDetailsAfter?: boolean): void {
    const lastDossierId = this.risqueDossierId;
    const shouldOpenDetailsAfter = openDetailsAfter ?? !this.showForm;
    this.showRisqueDialog = false;
    this.resetRisqueState();
    this.risqueDossierId = null;
    if (this.showForm && this.editingId && lastDossierId && this.editingId === lastDossierId) {
      this.loadEditRisques(this.editingId);
    }
    if (shouldOpenDetailsAfter) {
      this.actionDialogType = 'details';
      this.showActionDialog = true;
      this.loadAffaires();
    }
    this.syncBodyScrollLock();
  }

  canCreateAffaire(): boolean {
    return this.auth.hasRole('ROLE_ADMIN') || this.auth.hasRole('ROLE_RESPONSABLE_CONTENTIEUX') || this.auth.hasRole('ROLE_CHARGE_DOSSIER');
  }

  loadAffaires(): void {
    if (!this.selected) return;
    this.affairesLoading = true;
    this.contentieux.listAffaires(this.selected.id).subscribe({
      next: (rows) => {
        this.affaires = rows;
        this.affairesLoading = false;
      },
      error: () => {
        this.affairesLoading = false;
        this.showBanner('Erreur lors du chargement des affaires.', 'danger');
      }
    });
  }

  openAffaireCreate(): void {
    if (!this.selected) return;
    this.affaireForm = {
      typeAffaire: '',
      description: '',
      statut: 'EN_COURS',
      dateCreation: this.today()
    };
    this.showAffaireDialog = true;
    this.syncBodyScrollLock();
  }

  closeAffaireDialog(): void {
    this.showAffaireDialog = false;
    this.affaireSaving = false;
    this.syncBodyScrollLock();
  }

  submitAffaire(): void {
    if (!this.selected) return;
    if (!this.affaireForm.typeAffaire || !this.affaireForm.typeAffaire.trim()) {
      this.showBanner("Type d'affaire obligatoire.", 'danger');
      return;
    }
    if (!this.affaireForm.statut) {
      this.showBanner('Statut obligatoire.', 'danger');
      return;
    }
    if (!this.affaireForm.dateCreation) {
      this.showBanner('Date de création obligatoire.', 'danger');
      return;
    }
    this.affaireSaving = true;
    const payload: CreateAffaireRequest = {
      ...this.affaireForm,
      typeAffaire: this.affaireForm.typeAffaire.trim()
    };
    this.contentieux.createAffaire(this.selected.id, payload).subscribe({
      next: () => {
        this.affaireSaving = false;
        this.showAffaireDialog = false;
        this.showBanner('Affaire ajoutée au dossier avec succès.', 'success');
        this.loadAffaires();
        this.load();
      },
      error: (err) => {
        this.affaireSaving = false;
        const msg = err?.error?.message || err?.error?.error || "Erreur lors de la création de l'affaire.";
        this.showBanner(msg, 'danger');
      }
    });
  }

  affaireStatusBadge(statut: AffaireStatut): string {
    if (statut === 'TERMINEE') return 'app-status-badge app-status-badge--success';
    if (statut === 'EN_COURS') return 'app-status-badge app-status-badge--warning';
    return 'app-status-badge app-status-badge--info';
  }

  dossierStatusBadge(statut: ContentieuxStatus | null | undefined): string {
    if (!statut) return 'app-status-badge app-status-badge--neutral';
    if (statut === 'REJETE') return 'app-status-badge app-status-badge--danger';
    if (statut === 'A_VALIDER') return 'app-status-badge app-status-badge--warning';
    if (statut === 'OUVERT' || statut === 'AFFECTE' || statut === 'REOUVERT') return 'app-status-badge app-status-badge--success';
    if (statut === 'CLOTURE') return 'app-status-badge app-status-badge--neutral';
    return 'app-status-badge app-status-badge--info';
  }

  procedureStatusBadge(statut: string | null | undefined): string {
    const s = (statut || '').toUpperCase();
    if (s === 'JUGEE') return 'app-status-badge app-status-badge--success';
    if (s === 'EN_COURS') return 'app-status-badge app-status-badge--warning';
    if (s === 'CLOTUREE') return 'app-status-badge app-status-badge--neutral';
    if (s === 'SUSPENDUE') return 'app-status-badge app-status-badge--danger';
    return 'app-status-badge app-status-badge--info';
  }

  missionStatusBadge(statut: string | null | undefined): string {
    const s = (statut || '').toUpperCase();
    if (s === 'TERMINEE') return 'app-status-badge app-status-badge--success';
    if (s === 'EN_COURS' || s === 'ASSIGNEE') return 'app-status-badge app-status-badge--warning';
    if (s === 'ECHOUEE') return 'app-status-badge app-status-badge--danger';
    if (s === 'ANNULEE') return 'app-status-badge app-status-badge--neutral';
    return 'app-status-badge app-status-badge--info';
  }

  prestataireTypeBadge(type: string | null | undefined): string {
    const t = (type || '').toUpperCase();
    if (t === 'AVOCAT') return 'app-status-badge app-status-badge--info';
    if (t === 'HUISSIER') return 'app-status-badge app-status-badge--info';
    if (t === 'EXPERT') return 'app-status-badge app-status-badge--info';
    return 'app-status-badge app-status-badge--neutral';
  }

  prestataireLabel(pr: { nom: string; prenom?: string | null }): string {
    const full = `${pr?.nom || ''} ${pr?.prenom || ''}`.trim();
    return full || '—';
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
    this.resetRisqueEditorState();
    this.risqueSelection = {
      engagements: false,
      patrimoines: false,
      hypotheques: false,
      nantissements: false,
      cautions: false
    };
  }

  private resetRisqueEditorState(): void {
    this.risqueLoading = false;
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

  toggleDetailRisque(key: keyof ContentieuxPageComponent['detailRisqueSelection']): void {
    if (!this.selected) return;
    if (this.detailRisqueSaving) return;

    const next = !this.detailRisqueSelection[key];
    const dossierId = this.selected.id;

    if (!next) {
      const existing = this.getDetailRisqueCount(key);
      if (existing > 0) {
        this.showBanner('Suppression non disponible ici. Utilisez "Gérer en détail".', 'info');
        this.detailRisqueSelection[key] = true;
        return;
      }
      this.detailRisqueSelection[key] = false;
      return;
    }

    this.detailRisqueSelection[key] = true;
    if (this.getDetailRisqueCount(key) > 0) return;

    this.detailRisqueSaving = true;
    firstValueFrom(this.createDetailRisque(dossierId, key))
      .then(() => {
        this.detailRisqueSaving = false;
        this.showBanner('Ajout enregistré dans le dossier.', 'success');
        this.loadDetailRisqueSummary(dossierId);
        if (this.editingId === dossierId) this.loadEditRisques(dossierId);
      })
      .catch(() => {
        this.detailRisqueSaving = false;
        this.detailRisqueSelection[key] = false;
        this.showBanner('Erreur: impossible d’enregistrer ce choix dans le dossier.', 'danger');
      });
  }

  hasSelectedDetailRisques(): boolean {
    return Object.values(this.detailRisqueSelection).some(Boolean);
  }

  saveDetailRisqueSelection(): void {
    if (!this.selected) return;
    const dossierId = this.selected.id;
    const creates: Array<Promise<any>> = [];

    if (this.detailRisqueSelection.engagements && this.detailRisqueCounts.engagements === 0) {
      creates.push(firstValueFrom(this.risque.create<EngagementPayload>(dossierId, 'ENGAGEMENT', this.defaultEngagementPayload())));
    }
    if (this.detailRisqueSelection.patrimoines && this.detailRisqueCounts.patrimoines === 0) {
      creates.push(firstValueFrom(this.risque.create<PatrimoinePayload>(dossierId, 'PATRIMOINE', this.defaultPatrimoinePayload())));
    }
    if (this.detailRisqueSelection.hypotheques && this.detailRisqueCounts.hypotheques === 0) {
      creates.push(firstValueFrom(this.risque.create<GarantiePayload>(dossierId, 'GARANTIE_HYPOTHEQUE', this.defaultGarantiePayload('GARANTIE_HYPOTHEQUE'))));
    }
    if (this.detailRisqueSelection.nantissements && this.detailRisqueCounts.nantissements === 0) {
      creates.push(firstValueFrom(this.risque.create<GarantiePayload>(dossierId, 'GARANTIE_NANTISSEMENT', this.defaultGarantiePayload('GARANTIE_NANTISSEMENT'))));
    }
    if (this.detailRisqueSelection.cautions && this.detailRisqueCounts.cautions === 0) {
      creates.push(firstValueFrom(this.risque.create<GarantiePayload>(dossierId, 'GARANTIE_CAUTION', this.defaultGarantiePayload('GARANTIE_CAUTION'))));
    }

    if (creates.length === 0) {
      this.showBanner('Les éléments sélectionnés sont déjà associés à ce dossier.', 'info');
      return;
    }

    this.detailRisqueSaving = true;
    Promise.all(creates)
      .then(() => {
        this.detailRisqueSaving = false;
        this.showBanner('Risques associés enregistrés dans le dossier.', 'success');
        this.loadDossierDetails();
        if (this.editingId === dossierId) this.loadEditRisques(dossierId);
      })
      .catch(() => {
        this.detailRisqueSaving = false;
        this.showBanner('Erreur lors de l’enregistrement des risques associés.', 'danger');
      });
  }

  private defaultEngagementPayload(): EngagementPayload {
    return {
      numeroCompte: this.selected?.compteActuel || '',
      titreCreance: 'Engagement à compléter',
      dateContrat: '',
      interetType: '',
      taux: '',
      echeance: '',
      montantRestant: '',
      numRisque: this.selected?.reference || 'A_COMPLETER'
    };
  }

  private createDetailRisque(dossierId: number, key: keyof ContentieuxPageComponent['detailRisqueSelection']) {
    if (key === 'engagements') {
      return this.risque.create<EngagementPayload>(dossierId, 'ENGAGEMENT', this.defaultEngagementPayload());
    }
    if (key === 'patrimoines') {
      return this.risque.create<PatrimoinePayload>(dossierId, 'PATRIMOINE', this.defaultPatrimoinePayload());
    }
    if (key === 'hypotheques') {
      return this.risque.create<GarantiePayload>(dossierId, 'GARANTIE_HYPOTHEQUE', this.defaultGarantiePayload('GARANTIE_HYPOTHEQUE'));
    }
    if (key === 'nantissements') {
      return this.risque.create<GarantiePayload>(dossierId, 'GARANTIE_NANTISSEMENT', this.defaultGarantiePayload('GARANTIE_NANTISSEMENT'));
    }
    return this.risque.create<GarantiePayload>(dossierId, 'GARANTIE_CAUTION', this.defaultGarantiePayload('GARANTIE_CAUTION'));
  }

  private getDetailRisqueCount(key: keyof ContentieuxPageComponent['detailRisqueSelection']): number {
    if (key === 'engagements') return this.detailRisqueCounts.engagements;
    if (key === 'patrimoines') return this.detailRisqueCounts.patrimoines;
    if (key === 'hypotheques') return this.detailRisqueCounts.hypotheques;
    if (key === 'nantissements') return this.detailRisqueCounts.nantissements;
    return this.detailRisqueCounts.cautions;
  }

  private defaultPatrimoinePayload(): PatrimoinePayload {
    return {
      nom: this.selected?.nomDebiteur || 'À compléter',
      prenom: '',
      dateNaissance: '',
      numeroDossier: this.selected?.reference || '',
      biensImmobiliers: '',
      comptesBancaires: '',
      investissementsActions: '',
      creditsPrets: '',
      autresDettes: '',
      dettesFiscalesPenalites: ''
    };
  }

  private defaultGarantiePayload(category: RisqueCategory): GarantiePayload {
    if (category === 'GARANTIE_HYPOTHEQUE') {
      return {
        dossier: this.selected?.reference || '',
        numeroCompte: this.selected?.compteActuel || '',
        montant: '',
        typeBien: 'À compléter',
        adresse: ''
      };
    }
    if (category === 'GARANTIE_NANTISSEMENT') {
      return {
        dossier: this.selected?.reference || '',
        numeroCompte: this.selected?.compteActuel || '',
        description: 'Nantissement à compléter',
        montant: ''
      };
    }
    return {
      numeroDossier: this.selected?.reference || '',
      numeroCompte: this.selected?.compteActuel || '',
      description: 'Caution à compléter',
      montantLimite: ''
    };
  }

  private loadDetailRisqueSummary(dossierId: number): void {
    this.detailRisqueLoading = true;
    let pending = 5;
    const done = () => {
      pending -= 1;
      if (pending <= 0) this.detailRisqueLoading = false;
    };

    this.risque.list<EngagementPayload>(dossierId, 'ENGAGEMENT').subscribe({
      next: (items) => {
        this.detailRisqueCounts.engagements = items.length;
        this.detailRisqueSelection.engagements = items.length > 0;
        done();
      },
      error: () => done()
    });
    this.risque.list<PatrimoinePayload>(dossierId, 'PATRIMOINE').subscribe({
      next: (items) => {
        this.detailRisqueCounts.patrimoines = items.length;
        this.detailRisqueSelection.patrimoines = items.length > 0;
        done();
      },
      error: () => done()
    });
    this.risque.list<GarantiePayload>(dossierId, 'GARANTIE_HYPOTHEQUE').subscribe({
      next: (items) => {
        this.detailRisqueCounts.hypotheques = items.length;
        this.detailRisqueSelection.hypotheques = items.length > 0;
        done();
      },
      error: () => done()
    });
    this.risque.list<GarantiePayload>(dossierId, 'GARANTIE_NANTISSEMENT').subscribe({
      next: (items) => {
        this.detailRisqueCounts.nantissements = items.length;
        this.detailRisqueSelection.nantissements = items.length > 0;
        done();
      },
      error: () => done()
    });
    this.risque.list<GarantiePayload>(dossierId, 'GARANTIE_CAUTION').subscribe({
      next: (items) => {
        this.detailRisqueCounts.cautions = items.length;
        this.detailRisqueSelection.cautions = items.length > 0;
        done();
      },
      error: () => done()
    });
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
    this.contentieux.assign(this.selected.id, { chargeDossierId: this.assignToId }).subscribe({
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

  openReject(dossier: DossierContentieux): void {
    if (!this.canValidate()) return;
    this.selected = dossier;
    this.rejectMotif = '';
    this.rejectSaving = false;
    this.actionDialogType = 'reject';
    this.showActionDialog = true;
  }

  confirmReject(): void {
    if (!this.selected) return;
    const motif = this.rejectMotif.trim();
    if (!motif) {
      this.showBanner('Motif de rejet obligatoire.', 'danger');
      return;
    }
    if (this.rejectSaving) return;
    this.rejectSaving = true;
    this.contentieux.reject(this.selected.id, motif).subscribe({
      next: (updated) => {
        this.rejectSaving = false;
        this.dossiers = this.dossiers.map((d) => (d.id === updated.id ? updated : d));
        this.showBanner('Dossier rejeté avec succès.', 'success');
        this.closeActionDialog();
      },
      error: () => {
        this.rejectSaving = false;
        this.showBanner('Erreur lors du rejet.', 'danger');
      }
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

  loadDossierDetails(): void {
    if (!this.selected) return;
    this.dossierDetailsLoading = true;
    this.dossierDetails = null;
    this.mlPrediction = null;
    this.mlPredictLoading = false;
    this.mlFormTouched = false;
    this.affairesLoading = true;
    this.relances = [];
    this.relancesLoading = true;
    this.contentieux.getDossierDetails(this.selected.id).subscribe({
      next: (data) => {
        this.dossierDetails = data;
        const storedUrgent = data?.dossier?.urgentPrediction;
        if (storedUrgent !== null && storedUrgent !== undefined) {
          this.mlPrediction = {
            urgent: !!storedUrgent,
            probability: data.dossier.urgentProbability ?? null,
            source: data.dossier.urgentSource || 'ML'
          };
        } else {
          this.mlPrediction = null;
        }
        this.affaires = data.affaires || [];
        this.affairesLoading = false;
        this.dossierDetailsLoading = false;
        this.loadDetailRisqueSummary(this.selected!.id);
        this.loadRelances();
        this.initMlFormDefaults(true);
      },
      error: () => {
        this.affairesLoading = false;
        this.dossierDetailsLoading = false;
        this.detailRisqueLoading = false;
        this.relancesLoading = false;
        this.mlPredictLoading = false;
        this.showBanner('Erreur lors du chargement des détails du dossier.', 'danger');
      }
    });
  }

  onMlFormChange(): void {
    this.mlFormTouched = true;
  }

  mlLevel(p: UrgencePredictionResponse): 'NON URGENT' | 'MOYEN' | 'URGENT' {
    const lvl = (p as any)?.level;
    if (typeof lvl === 'string' && (lvl === 'NON URGENT' || lvl === 'MOYEN' || lvl === 'URGENT')) return lvl;
    const prob = p.probability;
    if (typeof prob === 'number' && Number.isFinite(prob)) {
      if (prob < 0.4) return 'NON URGENT';
      if (prob < 0.7) return 'MOYEN';
      return 'URGENT';
    }
    return p.urgent ? 'URGENT' : 'NON URGENT';
  }

  predictMl(): void {
    if (!this.selected) return;
    if (this.mlPredictLoading) return;

    this.initMlFormDefaults(true);
    this.mlPredictLoading = true;
    this.mlPrediction = null;

    const montantStr = this.toDecimalStringOrUndefined(this.mlForm.montant);
    const montantNum = montantStr ? Number(montantStr) : 0;
    const typeAffaire = (this.affaires?.[0]?.typeAffaire || '').trim();
    const features: Record<string, any> = {
      retard_jours: Math.max(0, this.mlForm.retardJours ?? 0),
      montant: Number.isFinite(montantNum) ? montantNum : 0,
      nb_relance: Math.max(0, this.mlForm.nbRelances ?? 0),
      type_affaire: typeAffaire || undefined
    };

    this.contentieux.predictUrgenceMlDirect(features).subscribe({
      next: (pred) => {
        this.mlPrediction = pred;
        if (this.dossierDetails?.dossier) {
          this.dossierDetails.dossier.urgentPrediction = pred.urgent;
          this.dossierDetails.dossier.urgentProbability = pred.probability ?? null;
          this.dossierDetails.dossier.urgentSource = pred.source;
          this.dossierDetails.dossier.urgentPredictedAt = new Date().toISOString();
        }
        this.mlPredictLoading = false;
      },
      error: () => {
        this.contentieux.refreshUrgencePrediction(this.selected!.id).subscribe({
          next: (pred) => {
            this.mlPrediction = pred;
            if (this.dossierDetails?.dossier) {
              if (pred.source === 'ML') {
                this.dossierDetails.dossier.urgentPrediction = pred.urgent;
                this.dossierDetails.dossier.urgentProbability = pred.probability ?? null;
                this.dossierDetails.dossier.urgentSource = pred.source;
                this.dossierDetails.dossier.urgentPredictedAt = new Date().toISOString();
              } else {
                this.dossierDetails.dossier.urgentPrediction = null;
                this.dossierDetails.dossier.urgentProbability = null;
                this.dossierDetails.dossier.urgentSource = pred.source;
                this.dossierDetails.dossier.urgentPredictedAt = new Date().toISOString();
              }
            }
            this.mlPredictLoading = false;
          },
          error: () => {
            this.mlPredictLoading = false;
            this.showBanner('Erreur lors de la prédiction ML.', 'danger');
          }
        });
      }
    });
  }

  private initMlFormDefaults(force = false): void {
    if (!this.selected) return;
    if (!force && this.mlFormTouched) return;

    const dateStr = this.dossierDetails?.dossier?.createdAt || null;
    const dateOuverture = this.selected.dateOuverture || null;
    const baseDate = dateOuverture || (dateStr ? dateStr.slice(0, 10) : null);
    let retardJours: number | null = null;
    if (baseDate) {
      const d0 = new Date(baseDate);
      if (!isNaN(d0.getTime())) {
        const diff = Math.floor((Date.now() - d0.getTime()) / (24 * 60 * 60 * 1000));
        retardJours = Math.max(0, diff);
      }
    }

    const montantValue = this.dossierDetails?.dossier?.montantEngage ?? this.selected.montantEngage ?? null;
    const nbRelances = this.relances.length;

    this.mlForm = {
      retardJours,
      montant: montantValue != null ? String(montantValue) : '',
      nbRelances
    };
  }

  loadRelances(): void {
    if (!this.selected) return;
    this.relancesLoading = true;
    this.contentieux.listRelances(this.selected.id).subscribe({
      next: (rows) => {
        this.relances = rows || [];
        this.relancesLoading = false;
        this.initMlFormDefaults(false);
      },
      error: () => {
        this.relancesLoading = false;
      }
    });
  }

  openRelancesDialog(): void {
    if (!this.selected) return;
    this.actionDialogType = 'relances';
    this.relanceEditingId = null;
    this.relanceForm = {
      dateRelance: this.today(0),
      typeRelance: 'EMAIL',
      statut: 'ENVOYEE'
    };
    if (!this.relancesLoading && this.relances.length === 0) {
      this.loadRelances();
    }
    setTimeout(() => this.aos.refresh(), 0);
  }

  closeRelancesDialog(): void {
    this.actionDialogType = 'details';
    this.relanceSaving = false;
    this.relanceEditingId = null;
    setTimeout(() => this.aos.refresh(), 0);
  }

  startNewRelance(): void {
    this.relanceEditingId = null;
    this.relanceForm = {
      dateRelance: this.today(0),
      typeRelance: 'EMAIL',
      statut: 'ENVOYEE'
    };
  }

  editRelance(r: RelanceDto): void {
    this.relanceEditingId = r.id;
    this.relanceForm = {
      dateRelance: r.dateRelance,
      typeRelance: r.typeRelance,
      statut: r.statut
    };
  }

  saveRelance(): void {
    if (!this.selected || !this.canEditRelances() || this.relanceSaving) return;
    const payload: RelanceRequest = {
      dateRelance: (this.relanceForm.dateRelance || '').trim(),
      typeRelance: this.relanceForm.typeRelance,
      statut: this.relanceForm.statut
    };
    if (!payload.dateRelance) {
      this.showBanner('Veuillez renseigner la date de relance.', 'danger');
      return;
    }

    this.relanceSaving = true;
    const dossierId = this.selected.id;
    const obs = this.relanceEditingId
      ? this.contentieux.updateRelance(dossierId, this.relanceEditingId, payload)
      : this.contentieux.createRelance(dossierId, payload);

    obs.subscribe({
      next: (saved) => {
        const idx = this.relances.findIndex(x => x.id === saved.id);
        if (idx !== -1) this.relances = this.relances.map(x => (x.id === saved.id ? saved : x));
        else this.relances = [saved, ...this.relances];
        this.relanceSaving = false;
        this.showBanner('Relance enregistrée.', 'success');
        this.startNewRelance();
      },
      error: () => {
        this.relanceSaving = false;
        this.showBanner('Erreur lors de l’enregistrement de la relance.', 'danger');
      }
    });
  }

  closeActionDialog(): void {
    this.showActionDialog = false;
    this.actionDialogType = null;
    this.selected = null;
    this.affaires = [];
    this.affairesLoading = false;
    this.showAffaireDialog = false;
    this.affaireSaving = false;
    this.dossierDetails = null;
    this.dossierDetailsLoading = false;
    this.mlPrediction = null;
    this.mlPredictLoading = false;
    this.mlFormTouched = false;
    this.relances = [];
    this.relancesLoading = false;
    this.relanceSaving = false;
    this.relanceEditingId = null;
    this.detailRisqueLoading = false;
    this.detailRisqueSaving = false;
    this.detailRisqueSelection = {
      engagements: false,
      patrimoines: false,
      hypotheques: false,
      nantissements: false,
      cautions: false
    };
    this.detailRisqueCounts = {
      engagements: 0,
      patrimoines: 0,
      hypotheques: 0,
      nantissements: 0,
      cautions: 0
    };
    this.rejectMotif = '';
    this.rejectSaving = false;
    this.syncBodyScrollLock();
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
    if (statut === 'REJETE') return 'badge bg-danger-subtle text-danger';
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
    if (statut === 'REJETE') return 'Rejeté';
    if (statut === 'OUVERT') return 'Ouvert';
    if (statut === 'AFFECTE') return 'Affecté';
    if (statut === 'CHANGEMENT_COMPTE') return 'Changement de compte';
    if (statut === 'REOUVERT') return 'Réouvert';
    return 'Clôturé';
  }

  private toDecimalStringOrUndefined(value: string): string | undefined {
    let v = (value ?? '').trim();
    if (!v) return undefined;

    v = v.replace(/\u00A0/g, ' ').replace(/\s+/g, '');
    v = v.replace(/[^\d,.\-]/g, '');

    if (v.endsWith('.') || v.endsWith(',')) {
      v = v.slice(0, -1);
    }
    if (!v) return undefined;

    const firstMinus = v.indexOf('-');
    if (firstMinus > 0) return undefined;
    if (firstMinus === 0) {
      v = '-' + v.slice(1).replace(/-/g, '');
    }

    const dotCount = (v.match(/\./g) || []).length;
    const commaCount = (v.match(/,/g) || []).length;

    const lastDot = v.lastIndexOf('.');
    const lastComma = v.lastIndexOf(',');

    if (dotCount > 0 && commaCount > 0) {
      const decimalSep = lastDot > lastComma ? '.' : ',';
      const thousandsSep = decimalSep === '.' ? ',' : '.';
      v = v.split(thousandsSep).join('');
      v = decimalSep === ',' ? v.replace(',', '.') : v;
    } else if (commaCount > 0) {
      if (commaCount === 1) {
        const parts = v.split(',');
        if (parts.length === 2 && parts[1].length === 3 && parts[0].length >= 1) {
          v = parts[0] + parts[1];
        } else {
          v = v.replace(',', '.');
        }
      } else {
        const idx = lastComma;
        const raw = v.replace(/,/g, '');
        const decimals = v.length - idx - 1;
        if (decimals > 0) {
          const insertAt = raw.length - decimals;
          v = raw.slice(0, insertAt) + '.' + raw.slice(insertAt);
        } else {
          v = raw;
        }
      }
    } else if (dotCount > 0) {
      if (dotCount === 1) {
        const parts = v.split('.');
        if (parts.length === 2 && parts[1].length === 3 && parts[0].length >= 1) {
          v = parts[0] + parts[1];
        }
      } else {
        const idx = lastDot;
        const raw = v.replace(/\./g, '');
        const decimals = v.length - idx - 1;
        if (decimals > 0) {
          const insertAt = raw.length - decimals;
          v = raw.slice(0, insertAt) + '.' + raw.slice(insertAt);
        } else {
          v = raw;
        }
      }
    }

    if (!/^-?\d+(\.\d+)?$/.test(v)) return undefined;
    return v;
  }
}
