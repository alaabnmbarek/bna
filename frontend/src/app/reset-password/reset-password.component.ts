import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss'
})
export class ResetPasswordComponent {
  email = '';
  loading = false;
  message = '';
  isError = false;

  constructor(private auth: AuthService, private router: Router) {}

  submit() {
    this.message = '';
    this.isError = false;

    const email = this.email.trim();
    if (!email) {
      this.message = 'Veuillez saisir votre email.';
      this.isError = true;
      return;
    }

    this.loading = true;
    this.auth.resetPassword(email).subscribe({
      next: () => {
        this.loading = false;
        this.message = 'Si un compte existe pour cet email, un lien de réinitialisation a été envoyé.';
        this.isError = false;
      },
      error: (err) => {
        this.loading = false;
        this.message = err?.error?.message || 'Une erreur est survenue. Veuillez réessayer plus tard.';
        this.isError = true;
      }
    });
  }
}
