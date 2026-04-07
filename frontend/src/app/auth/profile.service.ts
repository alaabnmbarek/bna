import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface UserProfile {
  id?: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
  profileImage?: string;
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private apiUrl = '/api/user/profile';
  private profileSubject = new BehaviorSubject<UserProfile | null>(null);
  profile$ = this.profileSubject.asObservable();

  constructor(private http: HttpClient) {}

  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(this.apiUrl).pipe(
      tap(profile => this.profileSubject.next(profile))
    );
  }

  updateProfile(profile: UserProfile): Observable<UserProfile> {
    return this.http.put<UserProfile>(this.apiUrl, profile).pipe(
      tap(updatedProfile => this.profileSubject.next(updatedProfile))
    );
  }

  clearProfile() {
    this.profileSubject.next(null);
  }
}
