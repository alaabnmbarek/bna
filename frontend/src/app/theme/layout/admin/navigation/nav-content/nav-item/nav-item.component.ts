// Angular import
import { Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// Project import
import { NavigationItem } from '../../navigation';
import { SharedModule } from '../../../../../shared/shared.module';
import { LayoutStateService } from '../../../../../shared/service/layout-state.service';

@Component({
  selector: 'app-nav-item',
  standalone: true,
  imports: [CommonModule, SharedModule, RouterModule],
  templateUrl: './nav-item.component.html',
  styleUrl: './nav-item.component.scss'
})
export class NavItemComponent {
  // public props
  item = input.required<NavigationItem>();
  private layoutState = inject(LayoutStateService);

  // public method
  closeOtherMenu(event: MouseEvent) {
    const ele = event.target as HTMLElement;
    if (ele !== null && ele !== undefined) {
      const parent = ele.parentElement as HTMLElement;
      const up_parent = ((parent.parentElement as HTMLElement).parentElement as HTMLElement).parentElement as HTMLElement;
      const last_parent = (up_parent.parentElement as HTMLElement).parentElement as HTMLElement;
      if (last_parent.classList.contains('pcoded-submenu')) {
        up_parent.classList.remove('pcoded-trigger');
        up_parent.classList.remove('coded-trigger');
        up_parent.classList.remove('active');
      } else {
        const sections = document.querySelectorAll('.pcoded-hasmenu');
        for (let i = 0; i < sections.length; i++) {
          sections[i].classList.remove('active');
          sections[i].classList.remove('pcoded-trigger');
          sections[i].classList.remove('coded-trigger');
        }
      }

      if (parent.classList.contains('pcoded-hasmenu')) {
        parent.classList.add('pcoded-trigger');
        parent.classList.add('coded-trigger');
        parent.classList.add('active');
      } else if (up_parent.classList.contains('pcoded-hasmenu')) {
        up_parent.classList.add('pcoded-trigger');
        up_parent.classList.add('coded-trigger');
        up_parent.classList.add('active');
      } else if (last_parent.classList.contains('pcoded-hasmenu')) {
        last_parent.classList.add('pcoded-trigger');
        last_parent.classList.add('coded-trigger');
        last_parent.classList.add('active');
      }
    }

    // this.layoutState.toggleNavCollapsedMob();
    if ((document.querySelector('app-navigation.pcoded-navbar') as HTMLDivElement).classList.contains('mob-open')) {
      (document.querySelector('app-navigation.pcoded-navbar') as HTMLDivElement).classList.remove('mob-open');
    }
  }
}
