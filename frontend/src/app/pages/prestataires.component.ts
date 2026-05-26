import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CardComponent } from '../theme/shared/components/card/card.component';
import { Mission, NoteHonoraire, Prestataire, PrestataireType, PrestatairesService } from '../prestataires/prestataires.service';
import { AuthService } from '../auth/auth.service';
import { ProfileService } from '../auth/profile.service';
import { ContentieuxService, DossierContentieux } from '../contentieux/contentieux.service';
import { AosService } from '../aos/aos.service';

@Component({
  selector: 'app-prestataires-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CardComponent],
  templateUrl: './prestataires.component.html',
  styleUrl: './prestataires.component.scss'
})
export class PrestatairesPageComponent implements OnInit {
  prestataires: Prestataire[] = [];
  loading = false;
  showForm = false;
  isEditing = false;
  editingId: number | null = null;
  profileImage: string | undefined = 'assets/images/user/avatar-4.jpg';
  dossiers: DossierContentieux[] = [];
  showHonorairesModalState = false;
  honorairesSaving = false;
  showAvocatProfileModalState = false;
  avocatProfileLoading = false;
  selectedAvocat: Prestataire | null = null;
  avocatMissions: Mission[] = [];
  avocatNotes: NoteHonoraire[] = [];
  avocatAssociatedRows: Array<{ numero: string; type: string; statut: string }> = [];
  honorairesForm: {
    dossierId: number | null;
    dossierLabel: string | null;
    reference: string | null;
    compteActuel: string | null;
    agence: string | null;
    montantEngage: number | null;
    montantHonoraires: number | null;
    fraisAdministratifs: number | null;
    tva: number | null;
    total: number | null;
    dateEmission: string;
    statut: string;
    remarques: string;
    prestations: Array<{ type: string; description: string; montant: number }>;
  } = {
    dossierId: null,
    dossierLabel: null,
    reference: null,
    compteActuel: null,
    agence: null,
    montantEngage: null,
    montantHonoraires: null,
    fraisAdministratifs: null,
    tva: null,
    total: null,
    dateEmission: new Date().toISOString().split('T')[0],
    statut: 'BROUILLON',
    remarques: '',
    prestations: []
  };

  q = '';
  type: PrestataireType | '' = '';
  actif: '' | 'true' | 'false' = '';

  form: Partial<Prestataire> = {
    type: 'HUISSIER',
    nom: '',
    prenom: '',
    cabinet: '',
    numeroCompte: '',
    matriculeFiscale: '',
    natureJuridique: null,
    pttNomBanque: '',
    email: '',
    telephone: '',
    adresse: '',
    specialites: '',
    tarifs: '',
    disponibilites: '',
    experienceAvocat: null,
    actif: true
  };

  readonly types: PrestataireType[] = ['HUISSIER', 'AVOCAT', 'EXPERT', 'NOTAIRE'];
  readonly specialitesOptions: string[] = ['Civil', 'Commercial', 'Penal', 'Immobilier', 'Social'];

  constructor(
    private service: PrestatairesService,
    private router: Router,
    public auth: AuthService,
    private profileService: ProfileService,
    private contentieux: ContentieuxService,
    private aos: AosService
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

  load(): void {
    this.loading = true;
    const filters: any = {};
    if (this.q.trim()) filters.q = this.q.trim();
    if (this.type) filters.type = this.type;
    if (this.actif !== '') filters.actif = this.actif === 'true';

    this.service.listPrestataires(filters).subscribe({
      next: (data) => {
        this.prestataires = data;
        this.loading = false;
        setTimeout(() => this.aos.refresh(), 0);
      },
      error: (err) => {
        this.loading = false;
        this.showBanner('Erreur lors du chargement des prestataires.', 'danger');
        setTimeout(() => this.aos.refresh(), 0);
      }
    });
  }

  banner: { kind: 'success' | 'info' | 'danger'; message: string } | null = null;
  private bannerTimer: ReturnType<typeof setTimeout> | null = null;

  toggleForm(): void {
    this.showForm = !this.showForm;
    if (!this.showForm) this.resetForm();
    else setTimeout(() => this.aos.refresh(), 0);
  }

  closeForm(): void {
    this.showForm = false;
    this.resetForm();
  }

  resetForm(): void {
    this.isEditing = false;
    this.editingId = null;
    this.form = {
      type: 'HUISSIER',
      nom: '',
      prenom: '',
      cabinet: '',
      numeroCompte: '',
      matriculeFiscale: '',
      natureJuridique: null,
      pttNomBanque: '',
      email: '',
      telephone: '',
      adresse: '',
      specialites: '',
      tarifs: '',
      disponibilites: '',
      experienceAvocat: null,
      actif: true
    };
  }

  edit(p: Prestataire): void {
    this.isEditing = true;
    this.editingId = p.id;
    this.form = { ...p };
    this.showForm = true;
  }

  save(): void {
    if (!this.form.type) {
      this.showBanner('Type est obligatoire.', 'danger');
      return;
    }

    if (this.form.type === 'AVOCAT') {
      if (!this.form.nom || !this.form.prenom) {
        this.showBanner('Nom et prénom sont obligatoires.', 'danger');
        return;
      }
    } else if (!this.form.nom) {
      this.showBanner('Nom et type sont obligatoires.', 'danger');
      return;
    }

    const payload: any = { ...this.form };
    if (this.isEditing && this.editingId) {
      this.service.updatePrestataire(this.editingId, payload).subscribe({
        next: () => {
          this.load();
          this.closeForm();
          this.showBanner('Prestataire mis à jour.', 'success');
        },
        error: (err) => {
          this.showBanner('Erreur lors de la mise à jour du prestataire.', 'danger');
        }
      });
    } else {
      this.service.createPrestataire(payload).subscribe({
        next: () => {
          this.load();
          this.closeForm();
          this.showBanner('Prestataire créé.', 'success');
        },
        error: (err) => {
          this.showBanner('Erreur lors de la création du prestataire.', 'danger');
        }
      });
    }
  }

  deactivate(p: Prestataire): void {
    if (!confirm(`Désactiver ${p.nom} ?`)) return;
    this.service.deactivatePrestataire(p.id).subscribe({
      next: () => {
        this.load();
        this.showBanner('Prestataire désactivé.', 'info');
      },
      error: (err) => {
        this.showBanner('Erreur lors de la désactivation.', 'danger');
      }
    });
  }

  remove(p: Prestataire): void {
    if (!confirm(`Supprimer définitivement ${p.nom} ?`)) return;
    this.service.deletePrestataire(p.id).subscribe({
      next: () => {
        this.load();
        this.showBanner('Prestataire supprimé.', 'success');
      },
      error: (err) => {
        const msg = err?.error?.message || 'Erreur lors de la suppression.';
        this.showBanner(msg, 'danger');
      }
    });
  }

  open(p: Prestataire): void {
    this.router.navigate(['/prestataires', p.id]);
  }

  onRowClick(p: Prestataire): void {
    if (p.type !== 'AVOCAT') return;
    this.openAvocatProfile(p.id);
  }

  openAvocatProfile(prestataireId: number): void {
    this.showAvocatProfileModalState = true;
    this.avocatProfileLoading = true;
    this.selectedAvocat = null;
    this.avocatMissions = [];
    this.avocatNotes = [];
    this.avocatAssociatedRows = [];

    this.service.getPrestataire(prestataireId).subscribe({
      next: (p) => {
        if (p.type !== 'AVOCAT') {
          this.closeAvocatProfileModal();
          return;
        }
        this.selectedAvocat = p;
        this.loadAvocatExtras(prestataireId);
      },
      error: () => {
        this.avocatProfileLoading = false;
        this.showBanner('Erreur lors du chargement du profil avocat.', 'danger');
      }
    });
  }

  private loadAvocatExtras(prestataireId: number): void {
    let pending = 2;
    const done = () => {
      pending -= 1;
      if (pending <= 0) this.avocatProfileLoading = false;
    };

    this.service.listMissions(prestataireId).subscribe({
      next: (m) => {
        this.avocatMissions = m || [];
        this.rebuildAvocatAssociatedRows();
        done();
      },
      error: () => {
        done();
      }
    });

    this.service.listNotesHonoraires(prestataireId).subscribe({
      next: (n) => {
        this.avocatNotes = n || [];
        this.rebuildAvocatAssociatedRows();
        done();
      },
      error: () => {
        done();
      }
    });
  }

  closeAvocatProfileModal(): void {
    this.showAvocatProfileModalState = false;
    this.avocatProfileLoading = false;
    this.selectedAvocat = null;
    this.avocatMissions = [];
    this.avocatNotes = [];
    this.avocatAssociatedRows = [];
  }

  avocatFullName(p: Prestataire | null): string {
    if (!p) return '';
    const nom = (p.nom || '').trim();
    const prenom = (p.prenom || '').trim();
    return [nom, prenom].filter(Boolean).join(' ');
  }

  experienceAvocatDisplay(p?: Prestataire | null): string {
    const v = p?.experienceAvocat;
    if (typeof v === 'number' && Number.isFinite(v)) return String(Math.max(0, Math.floor(v)));
    return '—';
  }

  avocatAffairesTraitees(): number {
    return this.avocatMissions.filter((m) => m.statut === 'TERMINEE').length;
  }

  latestHonoraire(): NoteHonoraire | null {
    return this.avocatNotes.length > 0 ? this.avocatNotes[0] : null;
  }

  missionStatusBadge(status: string): string {
    if (status === 'TERMINEE') return 'bg-success-subtle text-success';
    if (status === 'EN_COURS') return 'bg-primary-subtle text-primary';
    if (status === 'ANNULEE') return 'bg-danger-subtle text-danger';
    return 'bg-secondary-subtle text-secondary';
  }

  dossierStatusBadge(status: string): string {
    if (status === 'TERMINEE') return this.missionStatusBadge(status);
    if (status === 'EN_COURS') return this.missionStatusBadge(status);
    if (status === 'ANNULEE') return this.missionStatusBadge(status);
    return 'bg-secondary-subtle text-secondary';
  }

  private rebuildAvocatAssociatedRows(): void {
    const map = new Map<string, { numero: string; type: string; statut: string }>();

    for (const m of this.avocatMissions) {
      const numero = (m.dossierReference || '').trim();
      if (!numero) continue;
      if (!map.has(numero)) {
        map.set(numero, { numero, type: m.titre || 'Mission', statut: m.statut || '—' });
      }
    }

    for (const n of this.avocatNotes) {
      const numero = (n.dossierReference || '').trim();
      if (!numero) continue;
      if (!map.has(numero)) {
        const label = (n.dossierObjet || '').trim();
        map.set(numero, { numero, type: label ? `Note d’honoraires — ${label}` : 'Note d’honoraires', statut: '—' });
      }
    }

    this.avocatAssociatedRows = Array.from(map.values());
  }

  editSelectedAvocat(): void {
    if (!this.selectedAvocat) return;
    this.edit(this.selectedAvocat);
    this.closeAvocatProfileModal();
  }

  formatNatureJuridique(v?: any): string {
    if (v === 'PERSONNE_PHYSIQUE') return 'Personne physique';
    if (v === 'PERSONNE_MORALE') return 'Personne morale';
    return '—';
  }

  openHonorairesModal(): void {
    if (this.form.type !== 'AVOCAT') return;
    this.showHonorairesModalState = true;
    if (this.dossiers.length === 0) {
      this.contentieux.list().subscribe({
        next: (data) => {
          this.dossiers = data;
        },
        error: () => {
          this.showBanner('Erreur lors du chargement des dossiers.', 'danger');
        }
      });
    }
  }

  closeHonorairesModal(): void {
    this.showHonorairesModalState = false;
    this.honorairesSaving = false;
    this.honorairesForm = {
      dossierId: null,
      dossierLabel: null,
      reference: null,
      compteActuel: null,
      agence: null,
      montantEngage: null,
      montantHonoraires: null,
      fraisAdministratifs: null,
      tva: null,
      total: null,
      dateEmission: new Date().toISOString().split('T')[0],
      statut: 'BROUILLON',
      remarques: '',
      prestations: []
    };
  }

  dossierLabel(d: DossierContentieux): string {
    const objet = (d.objet ?? '').trim();
    const ref = (d.reference ?? '').trim();
    if (objet) return `${objet} — ${ref}`;
    return ref || `Dossier #${d.id}`;
  }

  onDossierChange(): void {
    const id = this.honorairesForm.dossierId;
    const selected = id ? this.dossiers.find(d => d.id === id) : undefined;
    if (!selected) {
      this.honorairesForm.dossierLabel = null;
      this.honorairesForm.reference = null;
      this.honorairesForm.compteActuel = null;
      this.honorairesForm.agence = null;
      this.honorairesForm.montantEngage = null;
      this.honorairesForm.montantHonoraires = null;
      this.honorairesForm.fraisAdministratifs = null;
      this.honorairesForm.tva = null;
      this.honorairesForm.total = null;
      return;
    }

    this.honorairesForm.dossierLabel = this.dossierLabel(selected);
    this.honorairesForm.reference = selected.reference ?? null;
    this.honorairesForm.compteActuel = selected.compteActuel ?? null;
    this.honorairesForm.agence = selected.agence ?? null;
    this.honorairesForm.montantEngage = (selected.montantEngage ?? null) as any;

    const defaultHonoraires = (selected.montantHonoraires ?? null) as any;
    const defaultFrais = (selected.fraisAdministratifs ?? 150) as any;

    this.honorairesForm.montantHonoraires = this.toNumberOrNull(defaultHonoraires);
    this.honorairesForm.fraisAdministratifs = this.toNumberOrNull(defaultFrais);
    this.recalcHonoraires();
  }

  addPrestation(): void {
    this.honorairesForm.prestations.push({ type: 'HONORAIRES', description: '', montant: 0 });
    this.recalcHonoraires();
  }

  removePrestation(index: number): void {
    this.honorairesForm.prestations.splice(index, 1);
    this.recalcHonoraires();
  }

  recalcHonoraires(): void {
    const prestationsSum = this.honorairesForm.prestations.reduce((acc, curr) => acc + (this.toNumberOrNull(curr.montant) || 0), 0);
    const honoraires = this.toNumberOrNull(this.honorairesForm.montantHonoraires) || 0;
    const frais = this.toNumberOrNull(this.honorairesForm.fraisAdministratifs) || 0;
    
    const base = prestationsSum + honoraires + frais;
    const tva = base * 0.19;
    const total = base + tva;
    this.honorairesForm.tva = this.round3(tva);
    this.honorairesForm.total = this.round3(total);
  }

  saveHonoraires(): void {
    if (this.form.type !== 'AVOCAT') return;
    if (!this.honorairesForm.dossierId) {
      this.showBanner('Veuillez sélectionner un dossier.', 'danger');
      return;
    }
    const montantHonoraires = this.toNumberOrNull(this.honorairesForm.montantHonoraires) ?? 0;
    const fraisAdministratifs = this.toNumberOrNull(this.honorairesForm.fraisAdministratifs) ?? 0;

    // Vérification de cohérence
    if (this.honorairesForm.total && this.honorairesForm.total > 50000) {
      if (!confirm('Le montant total semble très élevé (> 50,000 DT). Voulez-vous continuer ?')) return;
    }

    const createNote = (prestataireId: number) => {
      this.honorairesSaving = true;
      this.service.createNoteHonoraire(prestataireId, {
        dossierId: this.honorairesForm.dossierId!,
        montantHonoraires,
        fraisAdministratifs,
        dateEmission: this.honorairesForm.dateEmission,
        statut: this.honorairesForm.statut,
        remarques: this.honorairesForm.remarques,
        prestations: this.honorairesForm.prestations
      }).subscribe({
        next: () => {
          this.honorairesSaving = false;
          this.closeHonorairesModal();
          this.load();
          this.showBanner('Note d’honoraire enregistrée.', 'success');
        },
        error: () => {
          this.honorairesSaving = false;
          this.showBanner('Erreur lors de l’enregistrement de la note d’honoraire.', 'danger');
        }
      });
    };

    if (this.isEditing && this.editingId) {
      createNote(this.editingId);
      return;
    }

    const payload: any = { ...this.form, actif: true };
    this.honorairesSaving = true;
    this.service.createPrestataire(payload).subscribe({
      next: (created) => {
        this.isEditing = true;
        this.editingId = created.id;
        this.form = { ...created };
        createNote(created.id);
      },
      error: () => {
        this.honorairesSaving = false;
        this.showBanner('Erreur lors de la création du prestataire.', 'danger');
      }
    });
  }

  formatMoney(v: number | null | undefined): string {
    if (v === null || v === undefined || Number.isNaN(v as any)) return '';
    return `${Number(v).toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} DT`;
  }

  private toNumberOrNull(v: any): number | null {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  private round3(v: number): number {
    return Math.round(v * 1000) / 1000;
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
