import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CardComponent } from '../theme/shared/components/card/card.component';
import { Mission, MissionStatus, Prestataire, PrestatairesService } from '../prestataires/prestataires.service';
import { AuthService } from '../auth/auth.service';
import { ProfileService } from '../auth/profile.service';
import { AosService } from '../aos/aos.service';

@Component({
  selector: 'app-prestataire-detail-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CardComponent],
  templateUrl: './prestataire-detail.component.html',
  styleUrl: './prestataire-detail.component.scss'
})
export class PrestataireDetailPageComponent implements OnInit, OnDestroy {
  prestataire: Prestataire | null = null;
  missions: Mission[] = [];
  loading = false;
  prestataireId!: number;
  isMe = false;
  profileImage: string | undefined = 'assets/images/user/avatar-4.jpg';
  showAssignForm = false;
  missionSearch = '';
  missionFilter: 'ALL' | 'EN_COURS' | 'TERMINEE' | 'EN_RETARD' = 'ALL';
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  missionForm: Partial<Mission> = {
    titre: '',
    description: '',
    dossierReference: '',
    statut: 'ASSIGNEE'
  };

  update: Record<number, Partial<Mission>> = {};
  readonly statuses: MissionStatus[] = ['ASSIGNEE', 'EN_COURS', 'TERMINEE', 'ECHOUEE', 'ANNULEE'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: PrestatairesService,
    public auth: AuthService,
    private profileService: ProfileService,
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

    const rawId = this.route.snapshot.paramMap.get('id');
    if (rawId === 'me') {
      this.isMe = true;
      this.loadMe();
    } else {
      this.prestataireId = Number(rawId);
      if (!this.prestataireId) {
        this.router.navigate(['/prestataires']);
        return;
      }
      this.load();
    }
    this.refreshTimer = setInterval(() => {
      if (!this.loading && (this.isMe || this.prestataireId)) this.loadMissions();
    }, 15000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  load(): void {
    this.loading = true;
    this.service.getPrestataire(this.prestataireId).subscribe({
      next: (p) => {
        this.prestataire = p;
        this.loadMissions();
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.router.navigate(['/prestataires']);
      }
    });
  }

  loadMe(): void {
    this.loading = true;
    this.service.getMyPrestataire().subscribe({
      next: (p) => {
        this.prestataire = p;
        this.prestataireId = p.id;
        this.loadMissions();
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.router.navigate(['/user']);
      }
    });
  }

  loadMissions(): void {
    const missions$ = this.isMe ? this.service.listMyMissions() : this.service.listMissions(this.prestataireId);
    missions$.subscribe({
      next: (m) => {
        this.missions = m;
        this.update = {};
        for (const mi of m) {
          this.update[mi.id] = {
            statut: mi.statut,
            notePerformance: mi.notePerformance ?? null,
            commentairePerformance: mi.commentairePerformance ?? ''
          };
        }
        this.loading = false;
        setTimeout(() => this.aos.refresh(), 0);
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        setTimeout(() => this.aos.refresh(), 0);
      }
    });
  }

  toggleAssign(): void {
    this.showAssignForm = !this.showAssignForm;
    setTimeout(() => this.aos.refresh(), 0);
  }

  get displayedMissions(): Mission[] {
    const q = (this.missionSearch || '').trim().toLowerCase();
    let rows = this.missions.slice();

    if (this.missionFilter === 'EN_COURS') {
      rows = rows.filter(m => m.statut === 'EN_COURS' || m.statut === 'ASSIGNEE');
      rows = rows.filter(m => !this.isOverdue(m));
    } else if (this.missionFilter === 'TERMINEE') {
      rows = rows.filter(m => m.statut === 'TERMINEE');
    } else if (this.missionFilter === 'EN_RETARD') {
      rows = rows.filter(m => this.isOverdue(m));
    }

    if (q) {
      rows = rows.filter(m => {
        const code = (m.codeMission || '').toLowerCase();
        const type = (m.typeMission || '').toLowerCase();
        const statut = this.statusLabel(m).toLowerCase();
        const affaire = (m.affaireNumero || '').toLowerCase();
        return code.includes(q) || type.includes(q) || statut.includes(q) || affaire.includes(q);
      });
    }

    rows.sort((a, b) => {
      const da = a.dateDebut ? new Date(a.dateDebut).getTime() : -Infinity;
      const db = b.dateDebut ? new Date(b.dateDebut).getTime() : -Infinity;
      return db - da;
    });

    return rows;
  }

  isOverdue(m: Mission): boolean {
    if (m.statut === 'TERMINEE' || m.statut === 'ANNULEE') return false;
    if (!m.dateEcheance) return false;
    const t = new Date(m.dateEcheance).getTime();
    if (!Number.isFinite(t)) return false;
    return t < new Date().setHours(0, 0, 0, 0);
  }

  statusLabel(m: Mission): string {
    if (this.isOverdue(m) && (m.statut === 'ASSIGNEE' || m.statut === 'EN_COURS')) return 'EN_RETARD';
    return m.statut;
  }

  statusBadgeClass(m: Mission): string {
    const s = this.statusLabel(m);
    if (s === 'TERMINEE') return 'badge bg-success-subtle text-success';
    if (s === 'EN_RETARD') return 'badge bg-danger-subtle text-danger';
    if (s === 'EN_COURS' || s === 'ASSIGNEE') return 'badge bg-warning-subtle text-warning';
    if (s === 'ECHOUEE') return 'badge bg-danger-subtle text-danger';
    return 'badge bg-secondary-subtle text-secondary';
  }

  createMission(): void {
    if (!this.missionForm.titre) {
      alert('Titre obligatoire');
      return;
    }
    const payload: any = { ...this.missionForm };
    this.service.createMission(this.prestataireId, payload).subscribe({
      next: () => {
        this.missionForm = { titre: '', description: '', dossierReference: '', statut: 'ASSIGNEE' };
        this.showAssignForm = false;
        this.loadMissions();
      },
      error: (err) => {
        console.error(err);
        alert('Erreur lors de l’affectation de la mission');
      }
    });
  }

  saveMission(missionId: number): void {
    const payload = this.update[missionId] || {};
    this.service.updateMission(missionId, payload).subscribe({
      next: () => this.loadMissions(),
      error: (err) => {
        console.error(err);
        alert('Erreur lors de la mise à jour de la mission');
      }
    });
  }

  back(): void {
    this.router.navigate([this.isMe ? '/user' : '/prestataires']);
  }
}
