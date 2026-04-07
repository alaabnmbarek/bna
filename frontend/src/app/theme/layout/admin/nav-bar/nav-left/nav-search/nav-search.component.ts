import { Component, OnInit, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../../../../auth/auth.service';
import { NavigationItem, NavigationItems } from '../../../navigation/navigation';

@Component({
  selector: 'app-nav-search',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './nav-search.component.html',
  styleUrls: ['./nav-search.component.scss']
})
export class NavSearchComponent implements OnInit {
  public isSearch: boolean;
  Search = output<string>();
  query = '';
  results: Array<{ title: string; url: string; icon?: string }> = [];

  constructor(
    private router: Router,
    private auth: AuthService
  ) {
    this.isSearch = false;
  }

  ngOnInit() { }

  onInput(value: string) {
    this.query = value;
    this.Search.emit(value);
    this.results = this.buildResults(value);
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.close();
      return;
    }
    if (event.key === 'Enter') {
      const first = this.results[0];
      if (first) this.goTo(first.url);
    }
  }

  open() {
    this.isSearch = true;
    this.results = this.buildResults(this.query);
  }

  close() {
    this.isSearch = false;
    this.query = '';
    this.results = [];
    this.Search.emit('');
  }

  goTo(url: string) {
    this.close();
    this.router.navigateByUrl(url);
  }

  private buildResults(query: string): Array<{ title: string; url: string; icon?: string }> {
    const q = (query || '').trim().toLowerCase();
    if (!q) return [];

    const items = this.flattenNavItems(NavigationItems);
    return items
      .filter(i => i.title.toLowerCase().includes(q) || i.url.toLowerCase().includes(q))
      .slice(0, 8);
  }

  private flattenNavItems(items: NavigationItem[]): Array<{ title: string; url: string; icon?: string }> {
    const out: Array<{ title: string; url: string; icon?: string }> = [];
    for (const item of items) {
      if (!this.hasAccess(item)) continue;
      if (item.type === 'item' && item.url) {
        out.push({ title: item.title, url: item.url, icon: item.icon });
        continue;
      }
      if (item.children && item.children.length > 0) {
        out.push(...this.flattenNavItems(item.children));
      }
    }
    return out;
  }

  private hasAccess(item: NavigationItem): boolean {
    if (!item.role || item.role.length === 0) return true;
    return item.role.some(r => this.auth.hasRole(r));
  }
}
