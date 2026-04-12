import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';

interface LoginResponse { token: string; refreshToken: string; expiresIn: number; role: string }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private storage: Storage;
  private tokenKey = 'auth_token';
  private refreshTokenKey = 'auth_refresh_token';
  private roleKey = 'auth_role';
  private userKey = 'auth_user';

  constructor(private http: HttpClient, private router: Router) {
    this.storage = window.sessionStorage;
  }

  useLocalStorage(remember: boolean) {
    if (remember) {
      // migrate token to localStorage
      const t = this.storage.getItem(this.tokenKey);
      const rt = this.storage.getItem(this.refreshTokenKey);
      const r = this.storage.getItem(this.roleKey);
      const u = this.storage.getItem(this.userKey);
      if (t) localStorage.setItem(this.tokenKey, t);
      if (rt) localStorage.setItem(this.refreshTokenKey, rt);
      if (r) localStorage.setItem(this.roleKey, r);
      if (u) localStorage.setItem(this.userKey, u);
      this.storage = localStorage;
    } else {
      this.storage = sessionStorage;
    }
  }

  login(username: string, password: string, remember = false) {
    return this.http.post<LoginResponse>('/api/auth/login', { username, password })
      .pipe(
        tap((res) => {
          this.useLocalStorage(remember);
          this.storage.setItem(this.tokenKey, res.token);
          this.storage.setItem(this.refreshTokenKey, res.refreshToken);
          this.storage.setItem(this.roleKey, res.role);
          this.storage.setItem(this.userKey, username);
        })
      );
  }

  refreshToken(): Observable<LoginResponse> {
    const rt = this.getRefreshToken();
    return this.http.post<LoginResponse>('/api/auth/refresh', { refreshToken: rt })
      .pipe(
        tap((res) => {
          this.storage.setItem(this.tokenKey, res.token);
          this.storage.setItem(this.refreshTokenKey, res.refreshToken);
        })
      );
  }

  register(username: string, password: string) {
    return this.http.post('/api/auth/register', { username, password });
  }

  resetPassword(email: string) {
    return this.http.post('/api/auth/reset-password', { email });
  }

  confirmResetPassword(token: string, newPassword: string) {
    return this.http.post('/api/auth/reset-password/confirm', { token, newPassword });
  }

  logout() {
    sessionStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem(this.refreshTokenKey);
    sessionStorage.removeItem(this.roleKey);
    sessionStorage.removeItem(this.userKey);
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.roleKey);
    localStorage.removeItem(this.userKey);
    this.router.navigate(['/login']);
  }

  token(): string | null { return this.storage.getItem(this.tokenKey) || localStorage.getItem(this.tokenKey) || sessionStorage.getItem(this.tokenKey); }
  getRefreshToken(): string | null { return this.storage.getItem(this.refreshTokenKey) || localStorage.getItem(this.refreshTokenKey) || sessionStorage.getItem(this.refreshTokenKey); }
  role(): string | null { return this.storage.getItem(this.roleKey) || localStorage.getItem(this.roleKey) || sessionStorage.getItem(this.roleKey); }
  username(): string | null { return this.storage.getItem(this.userKey) || localStorage.getItem(this.userKey) || sessionStorage.getItem(this.userKey); }

  isAuthenticated(): boolean {
    const t = this.token();
    if (!t) return false;
    const payload = this.decode(t);
    if (!payload) return false;
    const exp = payload['exp'];
    if (exp && Date.now() >= exp * 1000) {
      // In a real app, you might try to refresh here instead of logout
      return false;
    }
    return true;
  }

  hasRole(role: string): boolean {
    const t = this.token();
    if (!t) return false;
    const payload = this.decode(t);
    const roles = [this.role(), payload && payload['role'] ? payload['role'] : null].filter(Boolean);
    return roles.includes(role);
  }

  userId(): number | null {
    const t = this.token();
    if (!t) return null;
    const payload = this.decode(t);
    return payload && payload['uid'] ? Number(payload['uid']) : null;
  }

  private decode(token: string): any | null {
    try {
      const base64Payload = token.split('.')[1];
      const json = atob(base64Payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(json);
    } catch {
      return null;
    }
  }
}
