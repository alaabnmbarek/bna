import { AfterViewInit, Component, OnDestroy } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { AuthService } from './auth/auth.service';
import { AosService } from './aos/aos.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent implements AfterViewInit, OnDestroy {
  private sub: Subscription | null = null;

  constructor(public auth: AuthService, private router: Router, private aos: AosService) {}

  ngAfterViewInit(): void {
    this.aos.init({
      duration: 750,
      easing: 'ease-out-quart',
      offset: 80,
      delay: 0,
      once: true
    });

    this.sub = this.router.events.subscribe((e) => {
      if (e instanceof NavigationEnd) {
        setTimeout(() => this.aos.refresh(), 0);
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.sub = null;
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
