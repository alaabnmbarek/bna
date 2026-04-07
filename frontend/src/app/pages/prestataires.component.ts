import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CardComponent } from '../theme/shared/components/card/card.component';
import { Prestataire, PrestataireType, PrestatairesService } from '../prestataires/prestataires.service';

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

  q = '';
  type: PrestataireType | '' = '';
  actif: '' | 'true' | 'false' = '';

  form: Partial<Prestataire> = {
    type: 'HUISSIER',
    nom: '',
    email: '',
    telephone: '',
    adresse: '',
    specialites: '',
    tarifs: '',
    disponibilites: '',
    actif: true
  };

  readonly types: PrestataireType[] = ['HUISSIER', 'AVOCAT', 'EXPERT', 'NOTAIRE'];

  constructor(
    private service: PrestatairesService,
    private router: Router
  ) {}

  ngOnInit(): void {
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
      },
      error: (err) => {
        this.loading = false;
        this.showBanner('Erreur lors du chargement des prestataires.', 'danger');
      }
    });
  }

  banner: { kind: 'success' | 'info' | 'danger'; message: string } | null = null;
  private bannerTimer: ReturnType<typeof setTimeout> | null = null;

  toggleForm(): void {
    this.showForm = !this.showForm;
    if (!this.showForm) this.resetForm();
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
      email: '',
      telephone: '',
      adresse: '',
      specialites: '',
      tarifs: '',
      disponibilites: '',
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
    if (!this.form.nom || !this.form.type) {
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

  open(p: Prestataire): void {
    this.router.navigate(['/prestataires', p.id]);
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
