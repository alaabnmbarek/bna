import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgApexchartsModule, ApexOptions } from 'ng-apexcharts';
import { ContentieuxService, ContentieuxStatus, DossierContentieux } from '../contentieux/contentieux.service';
import { CardComponent } from '../theme/shared/components/card/card.component';
import { AuthService } from '../auth/auth.service';
import { ProfileService } from '../auth/profile.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgApexchartsModule, CardComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardPageComponent implements OnInit {
  statuses: ContentieuxStatus[] = ['A_VALIDER', 'OUVERT', 'AFFECTE', 'CHANGEMENT_COMPTE', 'CLOTURE', 'REOUVERT'];
  dossiers: DossierContentieux[] = [];
  loading = false;
  search = '';
  profileImage: string | undefined = 'assets/images/user/avatar-4.jpg';

  banner: { kind: 'success' | 'info' | 'danger'; message: string } | null = null;
  private bannerTimer: ReturnType<typeof setTimeout> | null = null;

  statusDonutOptions!: Partial<ApexOptions>;
  amountsBarOptions!: Partial<ApexOptions>;

  constructor(
    private contentieux: ContentieuxService,
    public auth: AuthService,
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

  load(): void {
    this.loading = true;
    this.contentieux.list().subscribe({
      next: (rows) => {
        this.dossiers = rows || [];
        this.loading = false;
        this.rebuildCharts();
      },
      error: () => {
        this.loading = false;
        this.dossiers = [];
        this.rebuildCharts();
        this.showBanner('Impossible de charger les dossiers contentieux.', 'danger');
      }
    });
  }

  countAll(): number {
    return this.dossiers.length;
  }

  countBy(statut: ContentieuxStatus): number {
    return this.dossiers.filter((d) => d.statut === statut).length;
  }

  countOpen(): number {
    return this.dossiers.filter((d) => d.statut !== 'CLOTURE').length;
  }

  countClosed(): number {
    return this.countBy('CLOTURE');
  }

  sumEngage(): number {
    return this.dossiers.reduce((acc, d) => acc + (d.montantEngage ?? 0), 0);
  }

  sumRecupere(): number {
    return this.dossiers.reduce((acc, d) => acc + (d.montantRecupere ?? 0), 0);
  }

  recouvrementRate(): number {
    const engage = this.sumEngage();
    if (!engage) return 0;
    return (this.sumRecupere() / engage) * 100;
  }

  latestDossiers(): DossierContentieux[] {
    const sorted = [...this.dossiers].sort((a, b) => this.dateScore(b) - this.dateScore(a));
    return sorted.slice(0, 8);
  }

  filteredLatest(): DossierContentieux[] {
    const q = this.search.trim().toLowerCase();
    const rows = this.latestDossiers();
    if (!q) return rows;
    return rows.filter((d) =>
      [
        d.reference,
        d.statut,
        d.nomDebiteur ?? '',
        d.compteActuel ?? '',
        d.chargeDossier ?? ''
      ].some((v) => String(v).toLowerCase().includes(q))
    );
  }

  statusLabel(statut: ContentieuxStatus): string {
    switch (statut) {
      case 'A_VALIDER':
        return 'À valider';
      case 'OUVERT':
        return 'Ouvert';
      case 'AFFECTE':
        return 'Affecté';
      case 'CHANGEMENT_COMPTE':
        return 'Chgt compte';
      case 'CLOTURE':
        return 'Clôturé';
      case 'REOUVERT':
        return 'Réouvert';
      default:
        return statut;
    }
  }

  badgeClass(statut: ContentieuxStatus): string {
    if (statut === 'A_VALIDER') return 'badge bg-warning-subtle text-warning';
    if (statut === 'CLOTURE') return 'badge bg-secondary-subtle text-secondary';
    if (statut === 'CHANGEMENT_COMPTE') return 'badge bg-info-subtle text-info';
    return 'badge bg-success-subtle text-success';
  }

  private rebuildCharts(): void {
    const counts = this.statuses.map((s) => this.countBy(s));
    this.statusDonutOptions = {
      chart: { type: 'donut', height: 260 },
      labels: this.statuses.map((s) => this.statusLabel(s)),
      series: counts,
      colors: ['#f59e0b', '#22c55e', '#16a34a', '#0ea5e9', '#64748b', '#10b981'],
      dataLabels: { enabled: false },
      legend: { position: 'bottom', fontSize: '12px' },
      plotOptions: { pie: { donut: { size: '70%' } } }
    };

    this.amountsBarOptions = {
      chart: { type: 'bar', height: 260, toolbar: { show: false } },
      plotOptions: { bar: { columnWidth: '40%', borderRadius: 10 } },
      dataLabels: { enabled: false },
      colors: ['#0ea5e9', '#006847'],
      series: [
        { name: 'Montant engagé', data: [this.sumEngage()] },
        { name: 'Montant récupéré', data: [this.sumRecupere()] }
      ],
      xaxis: { categories: ['Total'] },
      grid: { borderColor: 'rgba(15, 23, 42, 0.10)' },
      tooltip: { theme: 'light' }
    };
  }

  private dateScore(d: DossierContentieux): number {
    const raw = d.updatedAt || d.createdAt || d.validatedAt || d.dateOuverture || '';
    const t = raw ? new Date(raw).getTime() : 0;
    return Number.isFinite(t) ? t : 0;
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
