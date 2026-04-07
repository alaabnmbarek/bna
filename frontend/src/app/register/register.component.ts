import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.component.html'
})
export class RegisterComponent {
  username = '';
  password = '';
  confirmPassword = '';

  constructor(private auth: AuthService, private router: Router) {}

  submit() {
    if (this.password !== this.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    this.auth.register(this.username, this.password).subscribe({
      next: () => {
        alert('Registration successful! You can now sign in.');
        this.router.navigate(['/login']);
      },
      error: () => {
        alert('Registration failed. Username might already be taken.');
      }
    });
  }
}
