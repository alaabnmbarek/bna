import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgApexchartsModule, ApexOptions } from 'ng-apexcharts';
import { ContentieuxService, ContentieuxStatus, DossierContentieux } from '../contentieux/contentieux.service';
import { CardComponent } from '../theme/shared/components/card/card.component';
import { AuthService } from '../auth/auth.service';
import { ProfileService } from '../auth/profile.service';
import { Audience, AffaireJudiciaire, SuiviJudiciaireService } from '../suivi-judiciaire/suivi-judiciaire.service';

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
  quickFilter: 'ALL' | 'URGENT_48H' | 'EN_RETARD' | 'CE_MOIS' = 'ALL';
  profileImage: string | undefined = 'assets/images/user/avatar-4.jpg';

  banner: { kind: 'success' | 'info' | 'danger'; message: string } | null = null;
  private bannerTimer: ReturnType<typeof setTimeout> | null = null;

  statusDonutOptions!: Partial<ApexOptions>;
  recupLineOptions!: Partial<ApexOptions>;
  sparkTotalOptions!: Partial<ApexOptions>;
  sparkOpenOptions!: Partial<ApexOptions>;
  sparkEngageOptions!: Partial<ApexOptions>;
  sparkRecupOptions!: Partial<ApexOptions>;

  pipeline = { amiable: 0, judiciaire: 0, execution: 0 };
  urgences: Audience[] = [];
  prestatairePerf: Array<{ name: string; recupere: number; dossiers: number }> = [];
  topZones: Array<{ name: string; total: number; pct: number }> = [];
  zoneAgg = new Map<string, { total: number; engage: number; recupere: number }>();
  zoneTip = { visible: false, x: 0, y: 0, name: '', total: 0, engage: 0, recupere: 0 };

  constructor(
    private contentieux: ContentieuxService,
    private suivi: SuiviJudiciaireService,
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
        this.loadWidgets();
        this.rebuildZones();
      },
      error: () => {
        this.loading = false;
        this.dossiers = [];
        this.rebuildCharts();
        this.loadWidgets();
        this.rebuildZones();
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
    let rows = this.latestDossiers();

    if (this.quickFilter === 'CE_MOIS') {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      rows = rows.filter((d) => this.dateScore(d) >= start);
    } else if (this.quickFilter === 'EN_RETARD') {
      rows = rows.filter((d) => this.isOverdueDossier(d));
    }

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

  setQuickFilter(filter: 'ALL' | 'URGENT_48H' | 'EN_RETARD' | 'CE_MOIS'): void {
    this.quickFilter = filter;
  }

  private isOverdueDossier(d: DossierContentieux): boolean {
    const raw = d.updatedAt || d.createdAt || '';
    const t = raw ? new Date(raw).getTime() : 0;
    if (!t) return false;
    const days = (Date.now() - t) / (1000 * 60 * 60 * 24);
    return d.statut !== 'CLOTURE' && days >= 30;
  }

  private loadWidgets(): void {
    const start = new Date();
    const end = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const startIso = start.toISOString();
    const endIso = end.toISOString();

    this.suivi.getAllAffaires().subscribe({
      next: (affaires) => {
        this.rebuildPipelineAndPerf(affaires || []);
        this.rebuildCharts();
      },
      error: () => {
        this.pipeline = { amiable: 0, judiciaire: 0, execution: 0 };
        this.prestatairePerf = [];
      }
    });

    this.suivi.getAudiencier(startIso, endIso).subscribe({
      next: (rows) => {
        this.urgences = (rows || [])
          .filter(a => !!a.dateAudience)
          .sort((a, b) => new Date(a.dateAudience).getTime() - new Date(b.dateAudience).getTime())
          .slice(0, 6);
      },
      error: () => {
        this.urgences = [];
      }
    });
  }

  private rebuildPipelineAndPerf(affaires: AffaireJudiciaire[]): void {
    const byDossier = new Map<number, AffaireJudiciaire[]>();
    for (const a of affaires) {
      const id = a.dossierId;
      if (!byDossier.has(id)) byDossier.set(id, []);
      byDossier.get(id)!.push(a);
    }

    let amiable = 0;
    let judiciaire = 0;
    let execution = 0;

    for (const d of this.dossiers) {
      const procs = byDossier.get(d.id) || [];
      if (procs.length === 0) {
        amiable++;
        continue;
      }
      const hasJug = procs.some(p => p.statut === 'JUGEE');
      if (hasJug) execution++;
      else judiciaire++;
    }
    this.pipeline = { amiable, judiciaire, execution };

    const perfMap = new Map<string, { recupere: number; dossiers: Set<number> }>();
    for (const a of affaires) {
      const dossier = this.dossiers.find(d => d.id === a.dossierId);
      if (!dossier) continue;
      const name = (a.avocatNom || a.huissierNom || '').trim();
      if (!name) continue;
      if (!perfMap.has(name)) perfMap.set(name, { recupere: 0, dossiers: new Set<number>() });
      const rec = dossier.montantRecupere ?? 0;
      perfMap.get(name)!.recupere += rec;
      perfMap.get(name)!.dossiers.add(dossier.id);
    }

    this.prestatairePerf = Array.from(perfMap.entries())
      .map(([name, v]) => ({ name, recupere: v.recupere, dossiers: v.dossiers.size }))
      .sort((a, b) => b.recupere - a.recupere)
      .slice(0, 6);

    this.rebuildZones();
  }

  private rebuildZones(): void {
    const map = new Map<string, { total: number; engage: number; recupere: number }>();
    for (const d of this.dossiers) {
      const raw = (d.agence || '').trim();
      const key = raw || 'Autre';
      const prev = map.get(key) || { total: 0, engage: 0, recupere: 0 };
      prev.total += 1;
      prev.engage += d.montantEngage ?? 0;
      prev.recupere += d.montantRecupere ?? 0;
      map.set(key, prev);
    }
    this.zoneAgg = map;

    const top = Array.from(map.entries())
      .map(([name, v]) => ({ name, total: v.total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const max = top.reduce((acc, z) => Math.max(acc, z.total), 0) || 1;
    this.topZones = top.map(z => ({ ...z, pct: (z.total / max) * 100 }));
  }

  getZoneTotal(name: string): number {
    return this.zoneAgg.get(name)?.total ?? 0;
  }

  zoneColor(v: number): string {
    const max = this.topZones.reduce((acc, z) => Math.max(acc, z.total), 0) || 1;
    const r = v / max;
    if (r <= 0.33) return '#0b3d2e';
    if (r <= 0.66) return '#f59e0b';
    return '#ef4444';
  }

  showZoneTip(e: MouseEvent, name: string): void {
    const data = this.zoneAgg.get(name) || { total: 0, engage: 0, recupere: 0 };
    const target = e.currentTarget as SVGGraphicsElement | null;
    if (!target) return;
    const svg = target.ownerSVGElement;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const x = Math.max(10, Math.min(e.clientX - r.left + 14, r.width - 220));
    const y = Math.max(10, Math.min(e.clientY - r.top + 14, r.height - 130));
    this.zoneTip = { visible: true, x, y, name, total: data.total, engage: data.engage, recupere: data.recupere };
  }

  hideZoneTip(): void {
    this.zoneTip.visible = false;
  }

  pipelineTotal(): number {
    return this.pipeline.amiable + this.pipeline.judiciaire + this.pipeline.execution;
  }

  pipelinePct(value: number): number {
    const total = this.pipelineTotal();
    if (!total) return 0;
    return (value / total) * 100;
  }

  perfMax(): number {
    return this.prestatairePerf.reduce((acc, p) => Math.max(acc, p.recupere), 0);
  }

  perfPct(value: number): number {
    const max = this.perfMax();
    if (!max) return 0;
    return (value / max) * 100;
  }

  formatMoney(v: number): string {
    const n = Math.round(v);
    return new Intl.NumberFormat('fr-FR').format(n);
  }

  private rebuildCharts(): void {
    const counts = this.statuses.map((s) => this.countBy(s));
    this.statusDonutOptions = {
      chart: { type: 'donut', height: 260 },
      labels: this.statuses.map((s) => this.statusLabel(s)),
      series: counts,
      colors: ['#f59e0b', '#22c55e', '#16a34a', '#38bdf8', '#64748b', '#10b981'],
      dataLabels: { enabled: false },
      legend: { position: 'bottom', fontSize: '12px' },
      plotOptions: { pie: { donut: { size: '76%' } } },
      stroke: { width: 0 }
    };

    const months = this.last6Months();
    const monthlyRecup = months.map(m => this.sumRecupByMonth(m.year, m.month));
    this.recupLineOptions = {
      chart: { type: 'line', height: 260, toolbar: { show: false } },
      stroke: { curve: 'smooth', width: 3 },
      dataLabels: { enabled: false },
      colors: ['#006747'],
      series: [{ name: 'Montant récupéré', data: monthlyRecup }],
      xaxis: { categories: months.map(m => m.label) },
      grid: { borderColor: 'rgba(15, 23, 42, 0.10)' },
      tooltip: { theme: 'light' }
    };

    const sparkCommon: Partial<ApexOptions> = {
      chart: { type: 'line', height: 52, sparkline: { enabled: true } },
      stroke: { curve: 'smooth', width: 2 },
      dataLabels: { enabled: false },
      tooltip: { enabled: false }
    };
    this.sparkTotalOptions = { ...sparkCommon, colors: ['#4f46e5'], series: [{ data: months.map(m => this.countCreatedByMonth(m.year, m.month)) }] };
    this.sparkOpenOptions = { ...sparkCommon, colors: ['#22c55e'], series: [{ data: months.map(m => this.countOpenByMonth(m.year, m.month)) }] };
    this.sparkEngageOptions = { ...sparkCommon, colors: ['#38bdf8'], series: [{ data: months.map(m => this.sumEngageByMonth(m.year, m.month)) }] };
    this.sparkRecupOptions = { ...sparkCommon, colors: ['#006747'], series: [{ data: months.map(m => this.sumRecupByMonth(m.year, m.month)) }] };
  }

  private dateScore(d: DossierContentieux): number {
    const raw = d.updatedAt || d.createdAt || d.validatedAt || d.dateOuverture || '';
    const t = raw ? new Date(raw).getTime() : 0;
    return Number.isFinite(t) ? t : 0;
  }

  private last6Months(): Array<{ year: number; month: number; label: string }> {
    const now = new Date();
    const out: Array<{ year: number; month: number; label: string }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = d.getMonth();
      const year = d.getFullYear();
      const label = d.toLocaleDateString('fr-FR', { month: 'short' });
      out.push({ year, month, label });
    }
    return out;
  }

  private sumRecupByMonth(year: number, month: number): number {
    return this.dossiers.reduce((acc, d) => {
      const raw = d.updatedAt || d.createdAt || '';
      const dt = raw ? new Date(raw) : null;
      if (!dt) return acc;
      if (dt.getFullYear() !== year || dt.getMonth() !== month) return acc;
      return acc + (d.montantRecupere ?? 0);
    }, 0);
  }

  private sumEngageByMonth(year: number, month: number): number {
    return this.dossiers.reduce((acc, d) => {
      const raw = d.createdAt || d.dateOuverture || '';
      const dt = raw ? new Date(raw) : null;
      if (!dt) return acc;
      if (dt.getFullYear() !== year || dt.getMonth() !== month) return acc;
      return acc + (d.montantEngage ?? 0);
    }, 0);
  }

  private countCreatedByMonth(year: number, month: number): number {
    return this.dossiers.filter(d => {
      const raw = d.createdAt || '';
      const dt = raw ? new Date(raw) : null;
      if (!dt) return false;
      return dt.getFullYear() === year && dt.getMonth() === month;
    }).length;
  }

  private countOpenByMonth(year: number, month: number): number {
    return this.dossiers.filter(d => {
      const raw = d.createdAt || '';
      const dt = raw ? new Date(raw) : null;
      if (!dt) return false;
      if (dt.getFullYear() !== year || dt.getMonth() !== month) return false;
      return d.statut !== 'CLOTURE';
    }).length;
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
