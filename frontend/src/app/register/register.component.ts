import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  username = '';
  password = '';
  confirmPassword = '';
  showPassword = false;
  showConfirmPassword = false;
  loading = false;
  message = '';
  isError = false;

  constructor(private auth: AuthService, private router: Router) {}

  submit() {
    this.message = '';
    this.isError = false;

    if (this.password !== this.confirmPassword) {
      this.message = 'Les mots de passe ne correspondent pas.';
      this.isError = true;
      return;
    }

    if (!this.username.trim() || !this.password) {
      this.message = 'Veuillez renseigner l’identifiant et le mot de passe.';
      this.isError = true;
      return;
    }

    this.loading = true;
    this.auth.register(this.username.trim(), this.password).subscribe({
      next: () => {
        this.loading = false;
        this.message = 'Inscription réussie. Vous pouvez maintenant vous connecter.';
        this.isError = false;
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.loading = false;
        this.message = err?.error?.message || "Échec de l’inscription. L’identifiant est peut-être déjà utilisé.";
        this.isError = true;
      }
    });
  }
}
