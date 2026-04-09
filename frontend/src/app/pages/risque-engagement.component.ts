import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CardComponent } from '../theme/shared/components/card/card.component';
import { AuthService } from '../auth/auth.service';
import { ProfileService } from '../auth/profile.service';
import { ContentieuxService, DossierContentieux } from '../contentieux/contentieux.service';
import { DossierRisqueService, RisqueItem } from '../risque/dossier-risque.service';

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

@Component({
  selector: 'app-risque-engagement',
  standalone: true,
  imports: [CommonModule, FormsModule, CardComponent],
  templateUrl: './risque-engagement.component.html',
  styleUrl: './risque-engagement.component.scss'
})
export class RisqueEngagementPageComponent implements OnInit {
  profileImage: string | undefined = 'assets/images/user/avatar-4.jpg';

  banner: { kind: 'success' | 'info' | 'danger'; message: string } | null = null;
  private bannerTimer: ReturnType<typeof setTimeout> | null = null;

  search = '';
  loading = false;
  dossiers: DossierContentieux[] = [];
  dossierId: number | null = null;
  editingId: number | null = null;

  form: EngagementPayload = {
    numeroCompte: '',
    titreCreance: '',
    dateContrat: '',
    interetType: '' as '' | 'IC' | 'IR',
    taux: '' as string,
    echeance: '',
    montantRestant: '' as string,
    numRisque: ''
  };

  engagements: Array<RisqueItem<EngagementPayload>> = [];

  constructor(
    public auth: AuthService,
    private profileService: ProfileService,
    private contentieux: ContentieuxService,
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

    this.loadDossiers();
  }

  dossierLabel(d: DossierContentieux): string {
    const objet = (d.objet ?? '').trim();
    const ref = (d.reference ?? '').trim();
    if (objet) return `${ref} — ${objet}`;
    return ref || `Dossier #${d.id}`;
  }

  onDossierChange(): void {
    this.editingId = null;
    this.reset();
    this.loadEngagements();
  }

  private loadDossiers(): void {
    this.contentieux.list().subscribe({
      next: (rows) => {
        this.dossiers = rows || [];
      },
      error: () => {
        this.showBanner('Erreur lors du chargement des dossiers.', 'danger');
      }
    });
  }

  private loadEngagements(): void {
    if (!this.dossierId) {
      this.engagements = [];
      return;
    }
    this.loading = true;
    this.risque.list<EngagementPayload>(this.dossierId, 'ENGAGEMENT').subscribe({
      next: (items) => {
        this.engagements = items || [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.showBanner('Erreur lors du chargement des engagements.', 'danger');
      }
    });
  }

  save(): void {
    if (!this.dossierId) {
      this.showBanner('Veuillez sélectionner un dossier.', 'danger');
      return;
    }
    const requiredOk = this.form.numeroCompte.trim() && this.form.titreCreance.trim() && this.form.numRisque.trim();
    if (!requiredOk) {
      this.showBanner('Veuillez renseigner : N° compte, Titre créance et Num risque.', 'danger');
      return;
    }
    const payload: EngagementPayload = {
      numeroCompte: this.form.numeroCompte.trim(),
      titreCreance: this.form.titreCreance.trim(),
      dateContrat: this.form.dateContrat || '',
      interetType: this.form.interetType,
      taux: this.form.taux || '',
      echeance: this.form.echeance || '',
      montantRestant: this.form.montantRestant || '',
      numRisque: this.form.numRisque.trim()
    };

    this.loading = true;
    if (this.editingId) {
      this.risque.update<EngagementPayload>(this.dossierId, 'ENGAGEMENT', this.editingId, payload).subscribe({
        next: (updated) => {
          this.engagements = this.engagements.map((e) => (e.id === updated.id ? updated : e));
          this.loading = false;
          this.showBanner('Engagement mis à jour.', 'success');
          this.editingId = null;
          this.reset();
        },
        error: () => {
          this.loading = false;
          this.showBanner('Erreur lors de la mise à jour de l’engagement.', 'danger');
        }
      });
      return;
    }

    this.risque.create<EngagementPayload>(this.dossierId, 'ENGAGEMENT', payload).subscribe({
      next: (created) => {
        this.engagements = [created, ...this.engagements];
        this.loading = false;
        this.showBanner('Engagement enregistré et associé au dossier.', 'success');
        this.reset();
      },
      error: () => {
        this.loading = false;
        this.showBanner('Erreur lors de l’enregistrement de l’engagement.', 'danger');
      }
    });
  }

  openEdit(row: RisqueItem<EngagementPayload>): void {
    if (!this.dossierId) return;
    this.editingId = row.id;
    this.form = {
      numeroCompte: row.payload?.numeroCompte ?? '',
      titreCreance: row.payload?.titreCreance ?? '',
      dateContrat: row.payload?.dateContrat ?? '',
      interetType: (row.payload?.interetType ?? '') as any,
      taux: row.payload?.taux ?? '',
      echeance: row.payload?.echeance ?? '',
      montantRestant: row.payload?.montantRestant ?? '',
      numRisque: row.payload?.numRisque ?? ''
    };
  }

  remove(row: RisqueItem<EngagementPayload>): void {
    if (!this.dossierId) return;
    const ok = confirm(`Supprimer l’engagement du compte ${row.payload?.numeroCompte || ''} ?`);
    if (!ok) return;
    this.loading = true;
    this.risque.delete(this.dossierId, 'ENGAGEMENT', row.id).subscribe({
      next: () => {
        this.engagements = this.engagements.filter((e) => e.id !== row.id);
        this.loading = false;
        if (this.editingId === row.id) {
          this.editingId = null;
          this.reset();
        }
        this.showBanner('Engagement supprimé.', 'info');
      },
      error: () => {
        this.loading = false;
        this.showBanner('Erreur lors de la suppression de l’engagement.', 'danger');
      }
    });
  }

  reset(): void {
    this.form = {
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

  cancelEdit(): void {
    this.editingId = null;
    this.reset();
  }

  filteredEngagements(): typeof this.engagements {
    const q = this.search.trim().toLowerCase();
    if (!q) return this.engagements;
    return this.engagements.filter((e) => {
      const p = e.payload || ({} as EngagementPayload);
      return (
        (p.numeroCompte || '').toLowerCase().includes(q) ||
        (p.titreCreance || '').toLowerCase().includes(q) ||
        (p.numRisque || '').toLowerCase().includes(q)
      );
    });
  }

  filteredCount(): number {
    return this.filteredEngagements().length;
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
