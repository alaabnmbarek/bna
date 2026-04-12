import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardComponent } from '../../theme/shared/components/card/card.component';
import { AuthService } from '../../auth/auth.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, FormsModule, CardComponent],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.scss'
})
export class ChangePasswordComponent {
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  showCurrent = false;
  showNew = false;
  showConfirm = false;
  loading = false;
  message = '';
  isError = false;

  constructor(private http: HttpClient) {}

  submit() {
    if (this.newPassword !== this.confirmPassword) {
      this.message = 'Les mots de passe ne correspondent pas';
      this.isError = true;
      return;
    }

    this.loading = true;
    this.message = '';
    this.isError = false;
    
    this.http.post<any>('/api/auth/change-password', {
      currentPassword: this.currentPassword,
      newPassword: this.newPassword
    }).subscribe({
      next: (res) => {
        this.loading = false;
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        this.message = res?.message || "Demande envoyée. Vérifiez votre email et MailHog.";
        this.isError = false;
      },
      error: (err) => {
        this.message = err.error?.message || err.error?.error || 'Erreur lors de la modification du mot de passe';
        this.isError = true;
        this.loading = false;
      }
    });
  }
}
