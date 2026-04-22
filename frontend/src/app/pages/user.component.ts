import { Component, inject, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CardComponent } from '../theme/shared/components/card/card.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProfileService, UserProfile } from '../auth/profile.service';
import { AuthService } from '../auth/auth.service';
import { Prestataire, PrestatairesService, Mission } from '../prestataires/prestataires.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-user',
  standalone: true,
  imports: [CommonModule, CardComponent, FormsModule, RouterModule],
  templateUrl: './user.component.html',
  styleUrl: './user.component.scss'
})
export class UserPageComponent implements OnInit {
  profile: UserProfile = {
    username: '',
    email: '',
    fullName: '',
    role: '',
    profileImage: ''
  };

  prestataire: Prestataire | null = null;
  missions: Mission[] = [];
  notesCount = 0;
  facturesCount = 0;
  dossiersAffectes: Array<{ id: number; reference: string; nomDebiteur: string; statut: string }> = [];
  dashboardLoading = false;

  loading = true;
  saving = false;
  message = '';
  isError = false;

  private http = inject(HttpClient);
  private profileService = inject(ProfileService);
  private auth = inject(AuthService);
  private prestatairesService = inject(PrestatairesService);

  ngOnInit() {
    this.loadProfile();
    if (this.isPrestataireRole()) {
      this.loadPrestataireDashboard();
    }
  }

  isPrestataireRole(): boolean {
    const r = this.auth.role();
    return [
      'ROLE_PRESTATAIRE',
      'ROLE_AVOCAT',
      'ROLE_HUISSIER',
      'ROLE_EXPERT',
      'PRESTATAIRE',
      'AVOCAT',
      'HUISSIER',
      'EXPERT'
    ].includes(r || '');
  }

  avatarUrl(): string {
    return this.profile.profileImage || 'assets/images/user/avatar-4.jpg';
  }

  loadProfile() {
    this.profileService.getProfile().subscribe({
      next: (data) => {
        this.profile = data;
        this.loading = false;
      },
      error: (err) => {
        this.message = err?.error?.message || 'Erreur lors du chargement du profil';
        this.isError = true;
        this.loading = false;
      }
    });
  }

  loadPrestataireDashboard(): void {
    this.dashboardLoading = true;
    forkJoin({
      prestataire: this.prestatairesService.getMyPrestataire().pipe(catchError(() => of(null))),
      missions: this.prestatairesService.listMyMissions().pipe(catchError(() => of([] as Mission[]))),
      dossiers: this.prestatairesService.listMyDossiers().pipe(catchError(() => of([] as Array<{ id: number; reference: string; nomDebiteur: string; statut: string }>))),
      notes: this.http.get<any[]>('/api/notes-honoraires').pipe(catchError(() => of([]))),
      factures: this.http.get<any[]>('/api/factures').pipe(catchError(() => of([])))
    }).subscribe({
      next: (res) => {
        this.prestataire = res.prestataire;
        this.missions = res.missions || [];
        this.dossiersAffectes = res.dossiers || [];
        this.notesCount = (res.notes || []).length;
        this.facturesCount = (res.factures || []).length;
        this.dashboardLoading = false;
      },
      error: () => {
        this.prestataire = null;
        this.missions = [];
        this.dossiersAffectes = [];
        this.notesCount = 0;
        this.facturesCount = 0;
        this.dashboardLoading = false;
      }
    });
  }

  countMissionsByStatus(status: string): number {
    return (this.missions || []).filter((m) => (m.statut || '') === status).length;
  }

  onImageChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.profile.profileImage = e.target.result;
        this.profileService.updateProfile(this.profile).subscribe({
          next: (data) => {
            this.profile = data;
            this.message = 'Photo de profil mise à jour.';
            this.isError = false;
          },
          error: () => {
            this.message = 'Erreur lors de la mise à jour de la photo.';
            this.isError = true;
          }
        });
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage() {
    this.profile.profileImage = '';
    this.profileService.updateProfile(this.profile).subscribe({
      next: (data) => {
        this.profile = data;
        this.message = 'Photo de profil supprimée.';
        this.isError = false;
      },
      error: () => {
        this.message = 'Erreur lors de la suppression de la photo.';
        this.isError = true;
      }
    });
  }

  saveProfile() {
    this.saving = true;
    this.message = '';
    this.isError = false;
    this.profileService.updateProfile(this.profile).subscribe({
      next: (data) => {
        this.profile = data;
        this.saving = false;
        this.message = 'Profil mis à jour avec succès.';
        this.isError = false;
      },
      error: (err) => {
        this.saving = false;
        this.message = err.error?.message || err.error?.error || 'Erreur lors de la mise à jour du profil';
        this.isError = true;
      }
    });
  }
}
