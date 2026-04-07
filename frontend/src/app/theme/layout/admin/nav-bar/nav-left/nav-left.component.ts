import { Component, output } from '@angular/core';
import { NavSearchComponent } from './nav-search/nav-search.component';

@Component({
  selector: 'app-nav-left',
  standalone: true,
  imports: [NavSearchComponent],
  templateUrl: './nav-left.component.html',
  styleUrls: ['./nav-left.component.scss']
})
export class NavLeftComponent {
  // public props
  NavCollapsedMob = output();
  Search = output<string>();

  navCollapsedMob() {
    this.NavCollapsedMob.emit();
  }

  onSearch(value: string) {
    this.Search.emit(value);
  }
}
