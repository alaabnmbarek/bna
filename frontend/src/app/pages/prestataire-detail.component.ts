import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CardComponent } from '../theme/shared/components/card/card.component';
import { Mission, MissionStatus, Prestataire, PrestatairesService } from '../prestataires/prestataires.service';
import { AuthService } from '../auth/auth.service';
import { ProfileService } from '../auth/profile.service';

@Component({
  selector: 'app-prestataire-detail-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CardComponent],
  templateUrl: './prestataire-detail.component.html'
})
export class PrestataireDetailPageComponent implements OnInit {
  prestataire: Prestataire | null = null;
  missions: Mission[] = [];
  loading = false;
  prestataireId!: number;
  profileImage: string | undefined = 'assets/images/user/avatar-4.jpg';

  missionForm: Partial<Mission> = {
    titre: '',
    description: '',
    dossierReference: '',
    statut: 'ASSIGNEE'
  };

  update: Record<number, Partial<Mission>> = {};
  readonly statuses: MissionStatus[] = ['ASSIGNEE', 'EN_COURS', 'TERMINEE', 'ANNULEE'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: PrestatairesService,
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

    this.prestataireId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.prestataireId) {
      this.router.navigate(['/prestataires']);
      return;
    }
    this.load();
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

  loadMissions(): void {
    this.service.listMissions(this.prestataireId).subscribe({
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
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
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
    this.router.navigate(['/prestataires']);
  }
}
