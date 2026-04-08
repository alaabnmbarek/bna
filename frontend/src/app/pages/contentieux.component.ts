import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth/auth.service';
import { ProfileService } from '../auth/profile.service';
import { ContentieuxService, ContentieuxStatus, DossierContentieux } from '../contentieux/contentieux.service';
import { CardComponent } from '../theme/shared/components/card/card.component';

type ActionDialogType = 'assign' | 'changeAccount' | 'close' | 'details';

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

  agents = ['Non affecté', 'Chargé A', 'Chargé B', 'Chargé C'];

  banner: { kind: 'success' | 'info' | 'danger'; message: string } | null = null;
  private bannerTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    public auth: AuthService,
    private contentieux: ContentieuxService,
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

    this.load();
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

  assignTo = 'Non affecté';
  newCompte = '';
  closeDate = '';
  closeMotif = '';

  form = {
    reference: '',
    objet: '',
    nomDebiteur: '',
    compteActuel: '',
    ancienCompte: '',
    agence: '',
    chargeDossier: 'Non affecté',
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
    this.form = {
      reference: '',
      objet: '',
      nomDebiteur: '',
      compteActuel: '',
      ancienCompte: '',
      agence: '',
      chargeDossier: 'Non affecté',
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
      ancienCompte: dossier.ancienCompte || '',
      agence: dossier.agence || '',
      chargeDossier: dossier.chargeDossier || 'Non affecté',
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
      ancienCompte: this.form.ancienCompte,
      agence: this.form.agence,
      chargeDossier: this.form.chargeDossier,
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
    this.actionDialogType = 'details';
    this.showActionDialog = true;
  }

  openAssign(dossier: DossierContentieux): void {
    if (dossier.statut === 'A_VALIDER' && !this.canValidate()) {
      this.showBanner('Affectation impossible avant validation du Responsable Contentieux.', 'danger');
      return;
    }
    this.selected = dossier;
    this.assignTo = dossier.chargeDossier || 'Non affecté';
    this.actionDialogType = 'assign';
    this.showActionDialog = true;
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
