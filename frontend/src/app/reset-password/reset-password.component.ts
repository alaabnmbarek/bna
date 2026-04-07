import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './reset-password.component.html'
})
export class ResetPasswordComponent {
  email = '';

  constructor(private auth: AuthService, private router: Router) {}

  submit() {
    this.auth.resetPassword(this.email).subscribe({
      next: () => {
        alert('If an account exists for this email, a reset link has been sent.');
        this.router.navigate(['/login']);
      },
      error: () => {
        alert('An error occurred. Please try again later.');
      }
    });
  }
}
