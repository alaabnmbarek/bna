// Angular import
import { Component, inject } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

// project import
import { AuthService } from '../../../../../auth/auth.service';
import { SharedModule } from '../../../../shared/shared.module';

@Component({
  selector: 'app-nav-right',
  standalone: true,
  imports: [RouterModule, SharedModule, CommonModule],
  templateUrl: './nav-right.component.html',
  styleUrls: ['./nav-right.component.scss']
})
export class NavRightComponent {
  public auth = inject(AuthService);
  private router = inject(Router);

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
