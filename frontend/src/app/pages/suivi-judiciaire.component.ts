import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CardComponent } from '../theme/shared/components/card/card.component';
import { SuiviJudiciaireService, AffaireJudiciaire, Audience, Jugement, ProcedureType, AudienceStatus, DecisionType, AssignationTarget } from '../suivi-judiciaire/suivi-judiciaire.service';
import { AffaireContentieux, ContentieuxService, DossierContentieux, DossierDetailsResponse } from '../contentieux/contentieux.service';
import { PrestatairesService, Prestataire } from '../prestataires/prestataires.service';
import { AuthService } from '../auth/auth.service';
import { AosService } from '../aos/aos.service';

@Component({
  selector: 'app-suivi-judiciaire',
  standalone: true,
  imports: [CommonModule, FormsModule, CardComponent],
  templateUrl: './suivi-judiciaire.component.html',
  styleUrl: './suivi-judiciaire.component.scss'
})
export class SuiviJudiciaireComponent implements OnInit, OnDestroy {
  affaires: AffaireJudiciaire[] = [];
  audiences: Audience[] = [];
  dossiers: DossierContentieux[] = [];
  dossierAffaires: AffaireContentieux[] = [];
  dossierAffairesLoading = false;
  selectedNumeroAffaire = '';
  showDossierDetails = false;
  dossierDetailsLoading = false;
  dossierDetails: DossierDetailsResponse | null = null;
  avocats: Prestataire[] = [];
  huissiers: Prestataire[] = [];
  
  loading = false;
  showAffaireForm = false;
  showAudienceForm = false;
  showJugementForm = false;
  showAssignationPopup = false;
  selectedAffaire: AffaireJudiciaire | null = null;

  procedureTypeOptions: Array<{ value: ProcedureType; label: string }> = [
    { value: 'ASSIGNATION', label: "Procédure d'assignation" },
    { value: 'SAISIE_MOBILIERE', label: 'Procédure de saisie' },
    { value: 'APPEL', label: "Procédure d'appel" }
  ];
  assignationTargets: AssignationTarget[] = ['GARANTIE_PATRIMOINE', 'DEBITEUR_PRINCIPAL'];
  audienceStatuses: AudienceStatus[] = ['PROGRAMMEE', 'REALISEE', 'REPORTEE', 'ANNULEE'];
  decisionTypes: DecisionType[] = ['GAIN', 'PERTE', 'REPORT', 'EXECUTION', 'RADIATION', 'NON_LIEU'];

  newAffaire: AffaireJudiciaire = this.blankAffaire();
  newAudience: Audience = this.blankAudience();
  newJugement: Jugement = this.blankJugement();
  newAudienceDate = '';
  newAudienceTime = '';

  constructor(
    public suiviService: SuiviJudiciaireService,
    public contentieuxService: ContentieuxService,
    public prestataireService: PrestatairesService,
    public auth: AuthService,
    private aos: AosService
  ) {}

  get canCreateProcedure(): boolean {
    const r = this.auth.role();
    return ['ROLE_ADMIN', 'ROLE_CHARGE_DOSSIER', 'ROLE_RESPONSABLE_CONTENTIEUX', 'ADMIN', 'CHARGE_DOSSIER', 'RESPONSABLE_CONTENTIEUX'].includes(r || '');
  }

  get canRecordJugement(): boolean {
    const r = this.auth.role();
    return [
      'ROLE_ADMIN',
      'ROLE_CHARGE_DOSSIER',
      'ROLE_RESPONSABLE_CONTENTIEUX',
      'ROLE_AVOCAT',
      'ADMIN',
      'CHARGE_DOSSIER',
      'RESPONSABLE_CONTENTIEUX',
      'AVOCAT'
    ].includes(r || '');
  }

  ngOnInit(): void {
    this.loadAffaires();
    this.loadDossiers();
    this.loadPrestataires();
  }

  ngOnDestroy(): void {
    this.setBodyScrollLocked(false);
  }

  private closeAllPopups(): void {
    this.showAffaireForm = false;
    this.showAudienceForm = false;
    this.showJugementForm = false;
    this.showAssignationPopup = false;
    this.showDossierDetails = false;
    this.dossierDetailsLoading = false;
    this.dossierDetails = null;
  }

  private syncBodyScrollLock(): void {
    const anyOpen =
      this.showAffaireForm ||
      this.showAudienceForm ||
      this.showJugementForm ||
      this.showAssignationPopup ||
      this.showDossierDetails;
    this.setBodyScrollLocked(anyOpen);
  }

  closeAffaireForm(): void {
    this.showAffaireForm = false;
    this.showAssignationPopup = false;
    this.syncBodyScrollLock();
  }

  closeAudienceForm(): void {
    this.showAudienceForm = false;
    this.selectedAffaire = null;
    this.syncBodyScrollLock();
  }

  closeJugementForm(): void {
    this.showJugementForm = false;
    this.selectedAffaire = null;
    this.syncBodyScrollLock();
  }

  loadAffaires(): void {
    this.loading = true;
    this.suiviService.getAllAffaires().subscribe({
      next: (data) => {
        this.affaires = data;
        this.loading = false;
        setTimeout(() => this.aos.refresh(), 0);
      },
      error: () => {
        this.loading = false;
        setTimeout(() => this.aos.refresh(), 0);
      }
    });
  }

  loadDossiers(): void {
    this.contentieuxService.list().subscribe(data => this.dossiers = data);
  }

  loadPrestataires(): void {
    this.prestataireService.listPrestataires().subscribe(data => {
      this.avocats = data.filter(p => p.type === 'AVOCAT');
      this.huissiers = data.filter(p => p.type === 'HUISSIER');
      setTimeout(() => this.aos.refresh(), 0);
    });
  }

  blankAffaire(): AffaireJudiciaire {
    return {
      dossierId: 0,
      referenceTribunal: '',
      typeProcedure: 'ASSIGNATION',
      assignationTarget: undefined,
      garantiePatrimoine: '',
      montant: undefined,
      dateTransmission: new Date().toISOString().split('T')[0],
      avocatId: undefined,
      tribunal: '',
      dateOuverture: new Date().toISOString().split('T')[0],
      observations: ''
    };
  }

  blankAudience(): Audience {
    return {
      affaireId: 0,
      dateAudience: '',
      referenceAudience: '',
      tribunal: '',
      salle: '',
      objet: '',
      statut: 'PROGRAMMEE'
    };
  }

  blankJugement(): Jugement {
    return {
      affaireId: 0,
      dateJugement: new Date().toISOString().split('T')[0],
      typeDecision: 'GAIN',
      montantRecupere: 0,
      observations: ''
    };
  }

  openAffaireForm(): void {
    this.closeAllPopups();
    this.newAffaire = this.blankAffaire();
    this.dossierAffaires = [];
    this.selectedNumeroAffaire = '';
    this.showAffaireForm = true;
    this.syncBodyScrollLock();
    setTimeout(() => this.aos.refresh(), 0);
  }

  openDossierDetails(dossierId: number): void {
    const id = Number(dossierId);
    if (!id || !Number.isFinite(id)) return;
    this.closeAllPopups();
    this.showDossierDetails = true;
    this.syncBodyScrollLock();
    this.dossierDetailsLoading = true;
    this.dossierDetails = null;
    this.contentieuxService.getDossierDetails(id).subscribe({
      next: (data) => {
        this.dossierDetails = data;
        this.dossierDetailsLoading = false;
        setTimeout(() => this.aos.refresh(), 0);
      },
      error: () => {
        this.dossierDetailsLoading = false;
        setTimeout(() => this.aos.refresh(), 0);
      }
    });
  }

  closeDossierDetails(): void {
    this.showDossierDetails = false;
    this.dossierDetailsLoading = false;
    this.dossierDetails = null;
    this.syncBodyScrollLock();
  }

  private setBodyScrollLocked(locked: boolean): void {
    const cls = 'app-lock-scroll';
    const body = document?.body;
    if (!body) return;
    if (locked) body.classList.add(cls);
    else body.classList.remove(cls);
  }

  onDossierChange(dossierId: number): void {
    this.dossierAffaires = [];
    this.selectedNumeroAffaire = '';
    this.newAffaire.referenceTribunal = '';

    const id = Number(dossierId);
    if (!id || !Number.isFinite(id)) return;

    this.dossierAffairesLoading = true;
    this.contentieuxService.listAffaires(id).subscribe({
      next: (rows) => {
        this.dossierAffaires = rows || [];
        this.dossierAffairesLoading = false;
        const first = this.dossierAffaires.find(a => !!a.numeroAffaire);
        if (this.dossierAffaires.length === 1 && first?.numeroAffaire) {
          this.selectedNumeroAffaire = first.numeroAffaire;
          this.newAffaire.referenceTribunal = first.numeroAffaire;
        }
        setTimeout(() => this.aos.refresh(), 0);
      },
      error: () => {
        this.dossierAffairesLoading = false;
        setTimeout(() => this.aos.refresh(), 0);
      }
    });
  }

  onNumeroAffaireChange(numero: string): void {
    this.selectedNumeroAffaire = numero || '';
    this.newAffaire.referenceTribunal = this.selectedNumeroAffaire;
  }

  onTypeProcedureChange(): void {
    if (this.newAffaire.typeProcedure !== 'ASSIGNATION') {
      this.newAffaire.assignationTarget = undefined;
      this.newAffaire.garantiePatrimoine = '';
      this.newAffaire.montant = undefined;
    }
  }

  openAssignationPopup(): void {
    if (!this.newAffaire.dateTransmission) {
      this.newAffaire.dateTransmission = new Date().toISOString().split('T')[0];
    }
    this.showAudienceForm = false;
    this.showJugementForm = false;
    this.showDossierDetails = false;
    this.showAssignationPopup = true;
    this.syncBodyScrollLock();
  }

  closeAssignationPopup(): void {
    this.showAssignationPopup = false;
    this.syncBodyScrollLock();
  }

  saveAffaire(): void {
    if (!this.newAffaire.dossierId) {
      alert('Veuillez choisir un dossier.');
      return;
    }
    if (!this.newAffaire.referenceTribunal || !this.newAffaire.referenceTribunal.trim()) {
      alert('Veuillez choisir le N° Affaire.');
      return;
    }
    if (!this.newAffaire.tribunal || !this.newAffaire.tribunal.trim()) {
      alert('Veuillez saisir le tribunal.');
      return;
    }
    if (!this.newAffaire.avocatId) {
      alert('Veuillez choisir un avocat.');
      return;
    }
    if (!this.newAffaire.dateTransmission) {
      alert('Veuillez saisir la date de transmission.');
      return;
    }
    if (this.newAffaire.typeProcedure === 'ASSIGNATION') {
      if (!this.newAffaire.assignationTarget) {
        alert('Veuillez choisir le type d’assignation.');
        return;
      }
      if (this.newAffaire.assignationTarget === 'GARANTIE_PATRIMOINE') {
        if (!this.newAffaire.garantiePatrimoine || !this.newAffaire.garantiePatrimoine.trim()) {
          alert('Veuillez préciser la garantie ou le patrimoine.');
          return;
        }
        if (this.newAffaire.montant == null || Number.isNaN(Number(this.newAffaire.montant))) {
          alert('Veuillez saisir le montant.');
          return;
        }
      }
    }

    if (this.newAffaire.id) {
      this.suiviService.updateAffaire(this.newAffaire.id, this.newAffaire).subscribe({
        next: () => {
          this.closeAffaireForm();
          this.loadAffaires();
        },
        error: (err) => console.error(err)
      });
    } else {
      this.suiviService.createAffaire(this.newAffaire).subscribe({
        next: () => {
          this.closeAffaireForm();
          this.loadAffaires();
        },
        error: (err) => console.error(err)
      });
    }
  }

  procedureLabel(value?: ProcedureType): string {
    const v = value || 'ASSIGNATION';
    return this.procedureTypeOptions.find(o => o.value === v)?.label || v;
  }

  procedureLabelAny(value?: string | null): string {
    const v = (value || 'ASSIGNATION') as ProcedureType | string;
    const hit = this.procedureTypeOptions.find(o => o.value === v);
    return hit?.label || String(value || 'ASSIGNATION');
  }

  prestataireLabel(pr: { nom: string; prenom?: string | null }): string {
    const full = `${pr?.nom || ''} ${pr?.prenom || ''}`.trim();
    return full || '—';
  }

  viewAudiences(affaire: AffaireJudiciaire): void {
    if (!affaire || !affaire.id) {
      console.error('Affaire ou ID manquant pour charger les audiences');
      return;
    }
    
    this.closeAllPopups();
    this.selectedAffaire = affaire;
    this.showAudienceForm = true; // Ouvrir le modal immédiatement
    this.syncBodyScrollLock();
    this.audiences = []; // Vider la liste actuelle
    this.loading = true; // On peut réutiliser la variable loading ou en créer une spécifique

    this.addAudience(); // Préparer le formulaire d'ajout
    
    this.suiviService.getAudiencesByAffaire(affaire.id).subscribe({
      next: (data) => {
        this.audiences = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des audiences', err);
        this.loading = false;
        alert('Impossible de charger les audiences.');
      }
    });
  }

  addAudience(): void {
    this.newAudience = this.blankAudience();
    this.newAudience.affaireId = this.selectedAffaire!.id!;
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    this.newAudienceDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    this.newAudienceTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }

  saveAudience(): void {
    if (!this.newAudienceDate || !this.newAudienceTime) {
      alert('Veuillez saisir la date et l\'heure de l\'audience.');
      return;
    }
    if (!this.newAudience.referenceAudience || !this.newAudience.referenceAudience.trim()) {
      alert('Veuillez saisir la référence audience.');
      return;
    }
    if (!this.newAudience.tribunal || !this.newAudience.tribunal.trim()) {
      alert('Veuillez saisir le tribunal.');
      return;
    }
    if (!this.newAudience.objet || !this.newAudience.objet.trim()) {
      alert('Veuillez saisir l\'objet / motif.');
      return;
    }
    this.newAudience.dateAudience = `${this.newAudienceDate}T${this.newAudienceTime}`;

    this.suiviService.scheduleAudience(this.newAudience).subscribe({
      next: () => {
        this.viewAudiences(this.selectedAffaire!);
        this.newAudience = this.blankAudience();
        this.addAudience(); // Reset with new default date
      },
      error: (err) => {
        console.error('Erreur lors de la programmation de l\'audience', err);
        alert('Erreur lors de la programmation de l\'audience.');
      }
    });
  }

  openJugementForm(affaire: AffaireJudiciaire): void {
    this.closeAllPopups();
    this.selectedAffaire = affaire;
    this.newJugement = this.blankJugement();
    this.newJugement.affaireId = affaire.id!;
    this.showJugementForm = true;
    this.syncBodyScrollLock();
  }

  openEditAffaire(affaire: AffaireJudiciaire): void {
    this.closeAllPopups();
    this.newAffaire = { ...affaire };
    this.showAffaireForm = true;
    this.syncBodyScrollLock();
  }

  deleteAffaire(affaire: AffaireJudiciaire): void {
    if (confirm('Voulez-vous vraiment supprimer cette affaire ?')) {
      this.suiviService.deleteAffaire(affaire.id!).subscribe({
        next: () => {
          this.loadAffaires();
        },
        error: (err) => {
          console.error('Erreur lors de la suppression', err);
        }
      });
    }
  }

  saveJugement(): void {
    this.suiviService.recordJugement(this.newJugement).subscribe(() => {
      this.closeJugementForm();
      this.loadAffaires();
    });
  }
}
