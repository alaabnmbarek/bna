import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CardComponent } from '../theme/shared/components/card/card.component';
import { LegalPredictionResponse, LegalPredictionService } from '../prediction/legal-prediction.service';
import { AosService } from '../aos/aos.service';

@Component({
  selector: 'app-prediction-page',
  standalone: true,
  imports: [CommonModule, FormsModule, CardComponent],
  templateUrl: './prediction.component.html',
  styleUrl: './prediction.component.scss'
})
export class PredictionPageComponent {
  loading = false;
  result: LegalPredictionResponse | null = null;

  specialites: string[] = ['Civil', 'Commercial', 'Penal', 'Immobilier', 'Social'];
  typesAffaire: string[] = ['Contentieux', 'Recouvrement', 'Litige', 'Contrat', 'Succession'];
  typesProcedure: string[] = ['Assignation', 'Refere', 'Appel', 'Mediation', 'Execution'];

  form = {
    specialite_avocat: 'Civil',
    experience_avocat: 0,
    presence_huissier: 0,
    presence_expert: 0,
    nombre_audiences: 0,
    type_affaire: 'Contentieux',
    type_procedure: 'Assignation',
    nombre_reports: 0
  };

  banner: { kind: 'success' | 'info' | 'danger'; message: string } | null = null;
  private bannerTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private prediction: LegalPredictionService,
    private aos: AosService
  ) {}

  predict(): void {
    if (this.loading) return;
    this.loading = true;
    this.result = null;

    const payload = {
      specialite_avocat: (this.form.specialite_avocat || '').trim(),
      experience_avocat: Number(this.form.experience_avocat) || 0,
      presence_huissier: Number(this.form.presence_huissier) ? 1 : 0,
      presence_expert: Number(this.form.presence_expert) ? 1 : 0,
      nombre_audiences: Math.max(0, Number(this.form.nombre_audiences) || 0),
      type_affaire: (this.form.type_affaire || '').trim(),
      type_procedure: (this.form.type_procedure || '').trim(),
      nombre_reports: Math.max(0, Number(this.form.nombre_reports) || 0)
    };

    this.prediction.predict(payload).subscribe({
      next: (r) => {
        this.result = r;
        this.loading = false;
        this.showBanner('Prédiction effectuée.', 'success');
        setTimeout(() => this.aos.refresh(), 0);
      },
      error: () => {
        this.loading = false;
        this.showBanner('Erreur lors de la prédiction.', 'danger');
        setTimeout(() => this.aos.refresh(), 0);
      }
    });
  }

  probabilityPct(p: number): string {
    if (typeof p !== 'number' || !Number.isFinite(p)) return '—';
    return `${Math.round(p * 100)}%`;
  }

  private showBanner(message: string, kind: 'success' | 'info' | 'danger'): void {
    this.banner = { message, kind };
    if (this.bannerTimer) clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => (this.banner = null), 3000);
  }
}

