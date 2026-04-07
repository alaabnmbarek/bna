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

  private profileService = inject(ProfileService);

  ngOnInit() {
    this.loadProfile();
  }

  loadProfile() {
    this.profileService.getProfile().subscribe({
      next: (data) => {
        this.profile = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading profile', err);
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
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage() {
    this.profile.profileImage = '';
  }

  saveProfile() {
    this.saving = true;
    this.profileService.updateProfile(this.profile).subscribe({
      next: (data) => {
        this.profile = data;
        this.saving = false;
        alert('Profil mis à jour avec succès');
      },
      error: (err) => {
        console.error('Error saving profile', err);
        this.saving = false;
        const errorMessage = err.error?.error || 'Erreur lors de la mise à jour du profil';
        alert(errorMessage);
      }
    });
  }
}