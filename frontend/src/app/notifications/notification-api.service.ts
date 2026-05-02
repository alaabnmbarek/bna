import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Notification, UnreadCountResponse } from './notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationApiService {
  constructor(private http: HttpClient) {}

  listMine(): Observable<Notification[]> {
    return this.http.get<Notification[]>('/api/notifications');
  }

  unreadCount(): Observable<UnreadCountResponse> {
    return this.http.get<UnreadCountResponse>('/api/notifications/unread-count');
  }

  markRead(id: number): Observable<void> {
    return this.http.patch<void>(`/api/notifications/${id}/read`, {});
  }

  markAllRead(): Observable<void> {
    return this.http.post<void>('/api/notifications/mark-all-read', {});
  }

  clear(): Observable<void> {
    return this.http.delete<void>('/api/notifications');
  }
}
