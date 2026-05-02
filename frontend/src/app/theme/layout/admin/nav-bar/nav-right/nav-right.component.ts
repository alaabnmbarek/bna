// Angular import
import { Component, inject, OnInit } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

// project import
import { AuthService } from '../../../../../auth/auth.service';
import { ProfileService } from '../../../../../auth/profile.service';
import { SharedModule } from '../../../../shared/shared.module';
import { NotificationRealtimeService } from '../../../../../notifications/notification-realtime.service';
import { Notification } from '../../../../../notifications/notification.model';

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
  private notificationsRealtime = inject(NotificationRealtimeService);

  profileImage = 'assets/images/user/avatar-4.jpg';
  unreadCount = 0;
  notifications: Notification[] = [];

  ngOnInit(): void {
    this.profileService.profile$.subscribe((p) => {
      this.profileImage = p?.profileImage || 'assets/images/user/avatar-4.jpg';
    });

    if (this.auth.token()) {
      this.profileService.getProfile().subscribe();
      this.notificationsRealtime.connect();
    }

    this.notificationsRealtime.unreadCount$.subscribe((n) => (this.unreadCount = n));
    this.notificationsRealtime.notifications$.subscribe((list) => (this.notifications = list));
  }

  async markAllRead() {
    await this.notificationsRealtime.markAllRead();
  }

  async clearNotifications() {
    await this.notificationsRealtime.clear();
  }

  async openNotification(n: Notification) {
    if (!n.lu) {
      await this.notificationsRealtime.markRead(n.id);
    }
    if (n.resourceType === 'DOSSIER' && n.resourceId) {
      this.router.navigate(['/contentieux'], { queryParams: { dossierId: n.resourceId } });
      return;
    }
    if (n.resourceType === 'MISSION' && n.resourceId) {
      this.router.navigate(['/missions'], { queryParams: { missionId: n.resourceId } });
      return;
    }
  }

  logout() {
    this.notificationsRealtime.disconnect();
    this.auth.logout();
    this.profileService.clearProfile();
    this.router.navigate(['/login']);
  }
}
