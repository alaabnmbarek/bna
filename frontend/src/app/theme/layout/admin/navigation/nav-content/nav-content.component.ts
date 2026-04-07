// Angular import
import { Component, OnInit, output, inject } from '@angular/core';
import { Location } from '@angular/common';
import { RouterModule } from '@angular/router';

//theme version
import { environment } from '../../../../../../environments/environment';

// project import
import { NavigationItem, NavigationItems } from '../navigation';

import { NavCollapseComponent } from './nav-collapse/nav-collapse.component';
import { NavGroupComponent } from './nav-group/nav-group.component';
import { NavItemComponent } from './nav-item/nav-item.component';
import { AuthService } from '../../../../../auth/auth.service';
import { ProfileService } from '../../../../../auth/profile.service';

// NgScrollbarModule
import { SharedModule } from '../../../../shared/shared.module';

@Component({
  selector: 'app-nav-content',
  standalone: true,
  imports: [RouterModule, NavCollapseComponent, NavGroupComponent, NavItemComponent, SharedModule],
  templateUrl: './nav-content.component.html',
  styleUrl: './nav-content.component.scss'
})
export class NavContentComponent implements OnInit {
  private location = inject(Location);
  public auth = inject(AuthService);
  public profileService = inject(ProfileService);

  // public props
  NavCollapsedMob = output();
  isNavProfile = false;
  profileImage: string | undefined = 'assets/images/user/avatar-4.jpg';

  // version
  title = 'Demo application for version numbering';
  currentApplicationVersion = environment.appVersion;

  navigations!: NavigationItem[];
  windowWidth: number;

  // Constructor
  constructor() {
    this.navigations = NavigationItems;
    this.windowWidth = window.innerWidth;
  }

  // Life cycle events
  ngOnInit() {
    this.navigations = this.filterNavigation(NavigationItems);
    if (this.windowWidth < 1025) {
      setTimeout(() => {
        (document.querySelector('.pcoded-navbar') as HTMLDivElement).classList.add('menupos-static');
      }, 500);
    }

    // Subscribe to profile changes
    this.profileService.profile$.subscribe(profile => {
      if (profile && profile.profileImage) {
        this.profileImage = profile.profileImage;
      } else {
        this.profileImage = 'assets/images/user/avatar-4.jpg';
      }
    });

    // Initial load of profile to sync image
    if (this.auth.token()) {
      this.profileService.getProfile().subscribe();
    }
  }

  private filterNavigation(items: NavigationItem[]): NavigationItem[] {
    return items
      .map(item => {
        if (item.children && item.children.length > 0) {
          const filteredChildren = this.filterNavigation(item.children);
          return { ...item, children: filteredChildren };
        }
        return { ...item };
      })
      .filter(item => {
        if (!this.hasAccess(item)) return false;
        if ((item.type === 'group' || item.type === 'collapse') && item.children && item.children.length === 0) {
          return false;
        }
        return true;
      });
  }

  private hasAccess(item: NavigationItem): boolean {
    if (!item.role || item.role.length === 0) return true;
    return item.role.some(role => this.auth.hasRole(role));
  }

  fireOutClick() {
    let current_url = this.location.path();
    // eslint-disable-next-line
    // @ts-ignore
    if (this.location['_baseHref']) {
      // eslint-disable-next-line
      // @ts-ignore
      current_url = this.location['_baseHref'] + this.location.path();
    }
    const link = "a.nav-link[ href='" + current_url + "' ]";
    const ele = document.querySelector(link);
    if (ele !== null && ele !== undefined) {
      const parent = ele.parentElement;
      const up_parent = parent?.parentElement?.parentElement;
      const last_parent = up_parent?.parentElement;
      if (parent?.classList.contains('coded-hasmenu')) {
        parent.classList.add('pcoded-trigger');
        parent.classList.add('coded-trigger');
        parent.classList.add('active');
      } else if (up_parent?.classList.contains('coded-hasmenu')) {
        up_parent.classList.add('pcoded-trigger');
        up_parent.classList.add('coded-trigger');
        up_parent.classList.add('active');
      } else if (last_parent?.classList.contains('coded-hasmenu')) {
        last_parent.classList.add('pcoded-trigger');
        last_parent.classList.add('coded-trigger');
        last_parent.classList.add('active');
      }
    }
  }
}
