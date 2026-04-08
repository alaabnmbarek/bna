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
  hypothequeItems: Array<RisqueItem<GarantiePayload> & { _saving?: boolean; _deleting?: boolean; _json?: string }> = [];
  nantissementItems: Array<RisqueItem<GarantiePayload> & { _saving?: boolean; _deleting?: boolean; _json?: string }> = [];
  cautionItems: Array<RisqueItem<GarantiePayload> & { _saving?: boolean; _deleting?: boolean; _json?: string }> = [];

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
    observationsAdministratives: '',
    observationsFinancieres: '',
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
      observationsAdministratives: '',
      observationsFinancieres: '',
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
      observationsAdministratives: dossier.observationsAdministratives || '',
      observationsFinancieres: dossier.observationsFinancieres || '',
      dateCloture: dossier.dateCloture || '',
      motifCloture: dossier.motifCloture || ''
    };
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
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
      montantRecupere: this.toNumberOrUndefined(this.form.montantRecupere),
      observationsAdministratives: this.form.observationsAdministratives,
      observationsFinancieres: this.form.observationsFinancieres
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

  closeRisqueDialog(openDetailsAfter = true): void {
    this.showRisqueDialog = false;
    this.risqueStep = 'select';
    this.risqueLoading = false;
    if (openDetailsAfter) {
      this.actionDialogType = 'details';
      this.showActionDialog = true;
    }
  }

  continueRisque(): void {
    if (!this.selected) return;
    const dossierId = this.selected.id;
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
          if (cat === 'GARANTIE_HYPOTHEQUE') this.hypothequeItems = (items as any).map((i: any) => ({ ...i, _json: JSON.stringify(i.payload ?? {}, null, 2) }));
          if (cat === 'GARANTIE_NANTISSEMENT') this.nantissementItems = (items as any).map((i: any) => ({ ...i, _json: JSON.stringify(i.payload ?? {}, null, 2) }));
          if (cat === 'GARANTIE_CAUTION') this.cautionItems = (items as any).map((i: any) => ({ ...i, _json: JSON.stringify(i.payload ?? {}, null, 2) }));
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
    if (!this.selected) return;
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
    this.risque.create<EngagementPayload>(this.selected.id, 'ENGAGEMENT', payload).subscribe({
      next: (created) => {
        this.engagementItems = [created as any, ...this.engagementItems];
        this.newEngagement = this.blankEngagement();
        this.showBanner('Engagement enregistré.', 'success');
      },
      error: () => this.showBanner('Erreur lors de l’enregistrement de l’engagement.', 'danger')
    });
  }

  saveEngagement(item: RisqueItem<EngagementPayload> & { _saving?: boolean }): void {
    if (!this.selected) return;
    item._saving = true;
    this.risque.update<EngagementPayload>(this.selected.id, 'ENGAGEMENT', item.id, item.payload).subscribe({
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
    if (!this.selected) return;
    const ok = confirm(`Supprimer l’engagement du compte ${item.payload.numeroCompte} ?`);
    if (!ok) return;
    item._deleting = true;
    this.risque.delete(this.selected.id, 'ENGAGEMENT', item.id).subscribe({
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
    if (!this.selected) return;
    const requiredOk = this.newPatrimoine.nom.trim() && this.newPatrimoine.prenom.trim();
    if (!requiredOk) {
      this.showBanner('Veuillez renseigner : Nom et Prénom.', 'danger');
      return;
    }
    const payload: PatrimoinePayload = {
      nom: this.newPatrimoine.nom.trim(),
      prenom: this.newPatrimoine.prenom.trim(),
      dateNaissance: this.newPatrimoine.dateNaissance || '',
      numeroDossier: this.selected.reference,
      biensImmobiliers: this.newPatrimoine.biensImmobiliers || '',
      comptesBancaires: this.newPatrimoine.comptesBancaires || '',
      investissementsActions: this.newPatrimoine.investissementsActions || '',
      creditsPrets: this.newPatrimoine.creditsPrets || '',
      autresDettes: this.newPatrimoine.autresDettes || '',
      dettesFiscalesPenalites: this.newPatrimoine.dettesFiscalesPenalites || ''
    };
    this.risque.create<PatrimoinePayload>(this.selected.id, 'PATRIMOINE', payload).subscribe({
      next: (created) => {
        this.patrimoineItems = [created as any, ...this.patrimoineItems];
        this.newPatrimoine = this.blankPatrimoine();
        this.showBanner('Patrimoine enregistré.', 'success');
      },
      error: () => this.showBanner('Erreur lors de l’enregistrement du patrimoine.', 'danger')
    });
  }

  savePatrimoine(item: RisqueItem<PatrimoinePayload> & { _saving?: boolean }): void {
    if (!this.selected) return;
    item._saving = true;
    this.risque.update<PatrimoinePayload>(this.selected.id, 'PATRIMOINE', item.id, item.payload).subscribe({
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
    if (!this.selected) return;
    const ok = confirm(`Supprimer le patrimoine de ${item.payload.nom} ${item.payload.prenom} ?`);
    if (!ok) return;
    item._deleting = true;
    this.risque.delete(this.selected.id, 'PATRIMOINE', item.id).subscribe({
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
    if (!this.selected) return;
    const dossierId = this.selected.id;
    const payload = this.sanitizeGarantiePayload(category);
    this.risque.create<GarantiePayload>(dossierId, category, payload).subscribe({
      next: (created) => {
        const item: any = { ...created, _json: JSON.stringify(created.payload ?? {}, null, 2) };
        if (category === 'GARANTIE_HYPOTHEQUE') this.hypothequeItems = [item, ...this.hypothequeItems];
        if (category === 'GARANTIE_NANTISSEMENT') this.nantissementItems = [item, ...this.nantissementItems];
        if (category === 'GARANTIE_CAUTION') this.cautionItems = [item, ...this.cautionItems];
        if (category === 'GARANTIE_HYPOTHEQUE') this.newHypotheque = this.blankHypotheque();
        if (category === 'GARANTIE_NANTISSEMENT') this.newNantissement = this.blankNantissement();
        if (category === 'GARANTIE_CAUTION') this.newCaution = this.blankCaution();
        this.showBanner('Garantie enregistrée.', 'success');
      },
      error: () => this.showBanner('Erreur lors de l’enregistrement de la garantie.', 'danger')
    });
  }

  saveGarantie(category: RisqueCategory, item: RisqueItem<GarantiePayload> & { _saving?: boolean; _json?: string }): void {
    if (!this.selected) return;
    item._saving = true;
    let payload = item.payload;
    if (item._json) {
      const parsed = this.tryParseJson(item._json);
      if (parsed) payload = parsed;
    }
    this.risque.update<GarantiePayload>(this.selected.id, category, item.id, payload).subscribe({
      next: (updated) => {
        const merged: any = { ...updated, _json: JSON.stringify(updated.payload ?? {}, null, 2) };
        if (category === 'GARANTIE_HYPOTHEQUE') this.hypothequeItems = this.hypothequeItems.map((h) => (h.id === updated.id ? merged : h));
        if (category === 'GARANTIE_NANTISSEMENT') this.nantissementItems = this.nantissementItems.map((n) => (n.id === updated.id ? merged : n));
        if (category === 'GARANTIE_CAUTION') this.cautionItems = this.cautionItems.map((c) => (c.id === updated.id ? merged : c));
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
    if (!this.selected) return;
    const ok = confirm('Supprimer cette garantie ?');
    if (!ok) return;
    item._deleting = true;
    this.risque.delete(this.selected.id, category, item.id).subscribe({
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
      numeroCompte: '',
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
      dossier: this.selected?.reference || '',
      numeroCompte: '',
      montant: '',
      typeBien: '',
      adresse: ''
    };
  }

  private blankNantissement(): GarantiePayload {
    return {
      dossier: this.selected?.reference || '',
      numeroCompte: '',
      description: '',
      montant: ''
    };
  }

  private blankCaution(): GarantiePayload {
    return {
      numeroDossier: this.selected?.reference || '',
      numeroCompte: '',
      description: '',
      montantLimite: ''
    };
  }

  private sanitizeGarantiePayload(category: RisqueCategory): GarantiePayload {
    if (category === 'GARANTIE_HYPOTHEQUE') return { ...this.newHypotheque };
    if (category === 'GARANTIE_NANTISSEMENT') return { ...this.newNantissement };
    return { ...this.newCaution };
  }

  private tryParseJson(text: string): Record<string, any> | null {
    try {
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object') return null;
      return parsed as any;
    } catch {
      return null;
    }
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
