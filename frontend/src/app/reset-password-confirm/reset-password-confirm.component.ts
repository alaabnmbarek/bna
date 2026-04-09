import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-reset-password-confirm',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './reset-password-confirm.component.html',
  styleUrl: './reset-password-confirm.component.scss'
})
export class ResetPasswordConfirmComponent {
  token = '';
  newPassword = '';
  confirmPassword = '';
  showNew = false;
  showConfirm = false;
  loading = false;
  message = '';
  isError = false;

  constructor(private auth: AuthService, route: ActivatedRoute, private router: Router) {
    this.token = (route.snapshot.queryParamMap.get('token') || '').trim();
  }

  submit(): void {
    this.message = '';
    this.isError = false;

    if (!this.token) {
      this.message = 'Lien invalide.';
      this.isError = true;
      return;
    }

    if (!this.newPassword || this.newPassword !== this.confirmPassword) {
      this.message = 'Les mots de passe ne correspondent pas.';
      this.isError = true;
      return;
    }

    this.loading = true;
    this.auth.confirmResetPassword(this.token, this.newPassword).subscribe({
      next: () => {
        this.loading = false;
        this.message = 'Mot de passe réinitialisé. Vous pouvez vous connecter.';
        this.isError = false;
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.loading = false;
        this.message = err?.error?.message || 'Erreur lors de la réinitialisation du mot de passe.';
        this.isError = true;
      }
    });
  }
}

