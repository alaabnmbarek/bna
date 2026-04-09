import { Component, inject, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CardComponent } from '../theme/shared/components/card/card.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProfileService, UserProfile } from '../auth/profile.service';

@Component({
  selector: 'app-user',
  standalone: true,
  imports: [CommonModule, CardComponent, FormsModule],
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

  loading = true;
  saving = false;
  message = '';
  isError = false;

  private profileService = inject(ProfileService);

  ngOnInit() {
    this.loadProfile();
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
