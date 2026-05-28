import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, _state: RouterStateSnapshot): boolean {
    if (!this.auth.isAuthenticated()) {
      this.router.navigate(['/login']);
      return false;
    }
    const roles = route.data && route.data['roles'] as string[] | undefined;
    if (roles && !roles.some(r => this.auth.hasRole(r))) {
      const role = this.auth.role();
      if (role === 'ROLE_ADMIN' || role === 'ROLE_RESPONSABLE_CONTENTIEUX') {
        this.router.navigate(['/admin']);
      } else if (role === 'ROLE_CHARGE_DOSSIER') {
        this.router.navigate(['/contentieux']);
      } else {
        this.router.navigate(['/user']);
      }
      return false;
    }
    return true;
  }
}
