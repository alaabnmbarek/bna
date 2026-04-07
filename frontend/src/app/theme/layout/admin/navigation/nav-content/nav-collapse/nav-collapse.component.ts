// Angular import
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterModule } from '@angular/router';

// project import
import { NavigationItem } from '../../navigation';
import { SharedModule } from '../../../../../shared/shared.module';
import { NavItemComponent } from '../nav-item/nav-item.component';

@Component({
  selector: 'app-nav-collapse',
  standalone: true,
  imports: [CommonModule, SharedModule, RouterModule, NavItemComponent],
  templateUrl: './nav-collapse.component.html',
  styleUrl: './nav-collapse.component.scss'
})
export class NavCollapseComponent implements OnInit {
  private location = inject(Location);

  // public props
  item = input.required<NavigationItem>();
  expanded = signal(false);
  windowWidth = window.innerWidth;
  current_url: string = ''; // Add current URL property

  ngOnInit() {
    this.current_url = this.location.path();

    // eslint-disable-next-line
    //@ts-ignore
    const baseHref = this.location['_baseHref'] || ''; // Use baseHref if necessary
    this.current_url = baseHref + this.current_url;

    // Timeout to allow DOM to fully render before checking for the links
    setTimeout(() => {
      const links = document.querySelectorAll('a.nav-link') as NodeListOf<HTMLAnchorElement>;
      links.forEach((link: HTMLAnchorElement) => {
        if (link.getAttribute('href') === this.current_url) {
          let parent = link.parentElement;
          while (parent && parent.classList) {
            if (parent.classList.contains('pcoded-hasmenu')) {
              parent.classList.add('pcoded-trigger');
              parent.classList.add('coded-trigger');
              parent.classList.add('active');
              this.expanded.set(true);
            }
            parent = parent.parentElement;
          }
        }
      });
    }, 0);
  }

  // Method to handle the collapse of the navigation menu
  navCollapse(e: MouseEvent) {
    this.expanded.update((v) => !v);

    const target = e.target as HTMLElement;
    const parent = target.closest('li.pcoded-hasmenu') as HTMLElement | null;
    if (!parent) return;

    const sections = document.querySelectorAll('.pcoded-hasmenu');
    for (let i = 0; i < sections.length; i++) {
      if (sections[i] !== parent) {
        sections[i].classList.remove('pcoded-trigger');
        sections[i].classList.remove('coded-trigger');
        sections[i].classList.remove('active');
      }
    }

    const isOpen = parent.classList.toggle('pcoded-trigger');
    if (isOpen) {
      parent.classList.add('coded-trigger');
    } else {
      parent.classList.remove('coded-trigger');
    }
    if (isOpen) {
      parent.classList.add('active');
    } else {
      parent.classList.remove('active');
    }

    let ancestor = parent.parentElement?.closest('li.pcoded-hasmenu') as HTMLElement | null;
    while (ancestor) {
      ancestor.classList.add('pcoded-trigger');
      ancestor.classList.add('coded-trigger');
      ancestor.classList.add('active');
      ancestor = ancestor.parentElement?.closest('li.pcoded-hasmenu') as HTMLElement | null;
    }
  }
}
