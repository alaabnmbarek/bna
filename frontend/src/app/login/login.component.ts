import { Component } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  username = '';
  password = '';
  remember = false;
  loading = false;
  errorMessage = '';

  constructor(private auth: AuthService, private router: Router) {}

  submit() {
    this.errorMessage = '';
    this.loading = true;
    this.auth.login(this.username, this.password, this.remember).subscribe({
      next: () => {
        this.loading = false;
        const role = this.auth.role();
        if (role === 'ROLE_ADMIN') {
          this.router.navigate(['/admin']);
        } else {
          this.router.navigate(['/user']);
        }
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Identifiant ou mot de passe incorrect.';
      }
    });
  }
}
