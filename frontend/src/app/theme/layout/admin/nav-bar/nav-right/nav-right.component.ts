// Angular import
import { Component, inject, OnInit } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

// project import
import { AuthService } from '../../../../../auth/auth.service';
import { ProfileService } from '../../../../../auth/profile.service';
import { SharedModule } from '../../../../shared/shared.module';

@Component({
  selector: 'app-nav-right',
  standalone: true,
  imports: [RouterModule, SharedModule, CommonModule],
  templateUrl: './nav-right.component.html',
  styleUrls: ['./nav-right.component.scss']
})
export class NavRightComponent implements OnInit {
  public auth = inject(AuthService);
  private router = inject(Router);
  private profileService = inject(ProfileService);

  profileImage = 'assets/images/user/avatar-4.jpg';

  ngOnInit(): void {
    this.profileService.profile$.subscribe((p) => {
      this.profileImage = p?.profileImage || 'assets/images/user/avatar-4.jpg';
    });

    if (this.auth.token()) {
      this.profileService.getProfile().subscribe();
    }
  }

  logout() {
    this.auth.logout();
    this.profileService.clearProfile();
    this.router.navigate(['/login']);
  }
}
