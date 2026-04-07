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
  templateUrl: './change-password.component.html'
})
export class ChangePasswordComponent {
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
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
    
    this.http.post<any>('/api/auth/change-password', {
      currentPassword: this.currentPassword,
      newPassword: this.newPassword
    }).subscribe({
      next: (res) => {
        this.loading = false;
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        alert("Alerte mail pour validation. L'administrateur devra cliquer sur le lien reçu par mail pour que votre nouveau mot de passe devienne actif.");
      },
      error: (err) => {
        this.message = err.error?.message || 'Erreur lors de la modification du mot de passe';
        this.isError = true;
        this.loading = false;
      }
    });
  }
}
