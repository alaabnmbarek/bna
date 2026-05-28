import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CardComponent } from '../theme/shared/components/card/card.component';
import { ContentieuxService, DossierContentieux } from '../contentieux/contentieux.service';
import { PrestatairesService, Prestataire } from '../prestataires/prestataires.service';
import { AuthService } from '../auth/auth.service';
import { AffaireJudiciaire, DecisionType, ProcedureType, SuiviJudiciaireService } from '../suivi-judiciaire/suivi-judiciaire.service';

type StatutFilter = 'ALL' | 'EN_COURS' | 'SUSPENDUE' | 'GAIN' | 'PERTE';

@Component({
  selector: 'app-gerer-affaires',
  standalone: true,
  imports: [CommonModule, FormsModule, CardComponent],
  templateUrl: './gerer-affaires.component.html',
  styleUrl: './gerer-affaires.component.scss'
})
export class GererAffairesPageComponent implements OnInit {
  dossiers: DossierContentieux[] = [];
  avocats: Prestataire[] = [];

  selectedDossierId: number | null = null;
  loadingDossiers = false;
  loading = false;

  affaires: AffaireJudiciaire[] = [];
  search = '';
  statutFilter: StatutFilter = 'ALL';

  showForm = false;
  showView = false;
  editingId: number | null = null;
  selectedAffaire: AffaireJudiciaire | null = null;
  saving = false;

  procedureTypeOptions: Array<{ value: ProcedureType; label: string }> = [
    { value: 'ASSIGNATION', label: 'Assignation' },
    { value: 'REFERE', label: 'Refere' },
    { value: 'APPEL', label: 'Appel' },
    { value: 'MEDIATION', label: 'Mediation' },
    { value: 'EXECUTION', label: 'Execution' }
  ];

  form = this.blankForm();

  constructor(
    private contentieux: ContentieuxService,
    private suivi: SuiviJudiciaireService,
    private prestataires: PrestatairesService,
    public auth: AuthService
  ) {}

  ngOnInit(): void {
    this.loadDossiers();
    this.loadAvocats();
  }

  get canManage(): boolean {
    const r = this.auth.role();
    return ['ROLE_ADMIN', 'ROLE_CHARGE_DOSSIER', 'ROLE_RESPONSABLE_CONTENTIEUX', 'ADMIN', 'CHARGE_DOSSIER', 'RESPONSABLE_CONTENTIEUX'].includes(r || '');
  }

  loadDossiers(): void {
    this.loadingDossiers = true;
    this.contentieux.list().subscribe({
      next: (rows) => {
        this.dossiers = rows || [];
        if (this.selectedDossierId == null && this.dossiers.length > 0) {
          this.selectedDossierId = this.dossiers[0].id;
          this.loadAffaires();
        }
        this.loadingDossiers = false;
      },
      error: () => {
        this.dossiers = [];
        this.loadingDossiers = false;
      }
    });
  }

  loadAvocats(): void {
    this.prestataires.listPrestataires().subscribe({
      next: (rows) => {
        this.avocats = (rows || []).filter(p => p.type === 'AVOCAT');
      },
      error: () => {
        this.avocats = [];
      }
    });
  }

  onDossierChange(): void {
    this.search = '';
    this.statutFilter = 'ALL';
    this.loadAffaires();
  }

  loadAffaires(): void {
    const dossierId = this.selectedDossierId;
    if (!dossierId) {
      this.affaires = [];
      return;
    }
    this.loading = true;
    this.suivi.getAffairesByDossier(dossierId).subscribe({
      next: (rows) => {
        this.affaires = rows || [];
        this.loading = false;
      },
      error: () => {
        this.affaires = [];
        this.loading = false;
      }
    });
  }

  statsTotal(): number {
    return this.affaires.length;
  }

  statsGagnees(): number {
    return this.affaires.filter(a => (a.resultatDecision || '') === 'GAIN').length;
  }

  statsPerdues(): number {
    return this.affaires.filter(a => (a.resultatDecision || '') === 'PERTE').length;
  }

  statsEnCours(): number {
    return this.affaires.filter(a => (a.statut || '') === 'EN_COURS').length;
  }

  filteredAffaires(): AffaireJudiciaire[] {
    const q = (this.search || '').trim().toLowerCase();
    let rows = [...this.affaires];

    if (this.statutFilter !== 'ALL') {
      if (this.statutFilter === 'GAIN') rows = rows.filter(a => (a.resultatDecision || '') === 'GAIN');
      else if (this.statutFilter === 'PERTE') rows = rows.filter(a => (a.resultatDecision || '') === 'PERTE');
      else rows = rows.filter(a => (a.statut || '') === this.statutFilter);
    }

    if (!q) return rows;
    return rows.filter(a =>
      [
        a.dossierReference,
        a.referenceTribunal,
        a.titre,
        a.tribunal,
        a.avocatNom
      ].some(v => String(v || '').toLowerCase().includes(q))
    );
  }

  openCreate(): void {
    if (!this.canManage) return;
    this.editingId = null;
    this.form = this.blankForm();
    this.form.dossierId = this.selectedDossierId ?? null;
    this.syncReference();
    this.showForm = true;
  }

  openEdit(a: AffaireJudiciaire): void {
    if (!this.canManage) return;
    if (!a?.id) return;
    this.editingId = a.id;
    this.form = this.blankForm();
    this.form.dossierId = a.dossierId;
    this.form.referenceTribunal = a.referenceTribunal || '';
    this.form.titre = a.titre || '';
    this.form.typeProcedure = a.typeProcedure;
    this.form.tribunal = a.tribunal || '';
    this.form.avocatId = a.avocatId ?? null;
    this.form.description = a.observations || '';
    this.form.dateAudience = (a.dateAudience || '').slice(0, 10);
    this.form.statut = this.affaireStatutUi(a);
    this.showForm = true;
  }

  openViewDetails(a: AffaireJudiciaire): void {
    this.selectedAffaire = a;
    this.showView = true;
  }

  closeForm(): void {
    this.showForm = false;
    this.saving = false;
  }

  closeView(): void {
    this.showView = false;
    this.selectedAffaire = null;
  }

  deleteAffaire(a: AffaireJudiciaire): void {
    if (!this.canManage) return;
    if (!a?.id) return;
    if (!confirm('Voulez-vous vraiment supprimer cette affaire ?')) return;
    this.suivi.deleteAffaire(a.id).subscribe({
      next: () => this.loadAffaires(),
      error: () => alert('Erreur lors de la suppression.')
    });
  }

  syncReference(): void {
    if (this.editingId) return;
    const dossier = this.dossiers.find(d => d.id === this.form.dossierId);
    const refBase = dossier?.reference || 'DOS';
    this.form.referenceTribunal = this.generateReference(refBase);
  }

  private generateReference(dossierReference: string): string {
    const clean = String(dossierReference || 'DOS').replace(/[^a-zA-Z0-9]/g, '').slice(0, 14) || 'DOS';
    const token = Math.random().toString(16).slice(2, 8).toUpperCase();
    return `AFF-${clean}-${token}`;
  }

  save(): void {
    if (!this.canManage) return;
    if (!this.form.dossierId) {
      alert('Veuillez choisir un dossier.');
      return;
    }
    if (!this.form.typeProcedure) {
      alert('Veuillez choisir le type d’affaire.');
      return;
    }
    if (!this.form.tribunal || !this.form.tribunal.trim()) {
      alert('Veuillez saisir le tribunal.');
      return;
    }
    if (!this.form.avocatId) {
      alert('Veuillez choisir un responsable.');
      return;
    }

    this.saving = true;

    const today = new Date().toISOString().slice(0, 10);
    const statut = this.form.statut === 'GAIN' || this.form.statut === 'PERTE' ? 'JUGEE' : this.form.statut;
    const resultatDecision: DecisionType | null =
      this.form.statut === 'GAIN' || this.form.statut === 'PERTE' ? (this.form.statut as DecisionType) : null;

    const payload: AffaireJudiciaire = {
      dossierId: this.form.dossierId,
      referenceTribunal: this.form.referenceTribunal || '',
      titre: (this.form.titre || '').trim(),
      typeProcedure: this.form.typeProcedure,
      tribunal: (this.form.tribunal || '').trim(),
      avocatId: this.form.avocatId,
      observations: (this.form.description || '').trim(),
      statut: statut as any,
      resultatDecision: resultatDecision ?? undefined,
      dateOuverture: today,
      dateTransmission: (this.form.dateAudience || today),
      dateAudience: this.form.dateAudience || undefined
    };

    const req$ = this.editingId
      ? this.suivi.updateAffaire(this.editingId, payload)
      : this.suivi.createAffaire(payload);

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.closeForm();
        this.loadAffaires();
      },
      error: (err) => {
        console.error(err);
        this.saving = false;
        alert('Erreur lors de l’enregistrement.');
      }
    });
  }

  procedureLabel(value?: ProcedureType | null): string {
    const hit = this.procedureTypeOptions.find(o => o.value === value);
    return hit ? hit.label : (value ? String(value) : '—');
  }

  affaireStatutUi(a: AffaireJudiciaire): StatutFilter {
    if ((a.resultatDecision || '') === 'GAIN') return 'GAIN';
    if ((a.resultatDecision || '') === 'PERTE') return 'PERTE';
    if ((a.statut || '') === 'SUSPENDUE') return 'SUSPENDUE';
    return 'EN_COURS';
  }

  statutLabel(a: AffaireJudiciaire): string {
    const s = this.affaireStatutUi(a);
    if (s === 'GAIN') return 'Gagnée';
    if (s === 'PERTE') return 'Perdue';
    if (s === 'SUSPENDUE') return 'Suspendue';
    return 'En cours';
  }

  statutBadgeClass(a: AffaireJudiciaire): string {
    const s = this.affaireStatutUi(a);
    if (s === 'GAIN') return 'ga-pill ga-pill--gain';
    if (s === 'PERTE') return 'ga-pill ga-pill--perte';
    if (s === 'SUSPENDUE') return 'ga-pill ga-pill--susp';
    return 'ga-pill ga-pill--encours';
  }

  dateCreation(a: AffaireJudiciaire): string {
    const raw = a.createdAt || a.dateOuverture || '';
    return raw ? String(raw).slice(0, 10) : '—';
  }

  private blankForm() {
    return {
      dossierId: null as number | null,
      referenceTribunal: '',
      titre: '',
      typeProcedure: 'ASSIGNATION' as ProcedureType,
      tribunal: '',
      avocatId: null as number | null,
      description: '',
      statut: 'EN_COURS' as StatutFilter,
      dateAudience: ''
    };
  }
}

