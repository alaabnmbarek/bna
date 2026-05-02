import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject, firstValueFrom } from 'rxjs';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { AuthService } from '../auth/auth.service';
import { NotificationApiService } from './notification-api.service';
import { Notification } from './notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationRealtimeService {
  private client: Client | null = null;
  private isConnecting = false;

  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  notifications$ = this.notificationsSubject.asObservable();

  private unreadCountSubject = new BehaviorSubject<number>(0);
  unreadCount$ = this.unreadCountSubject.asObservable();

  private newNotificationSubject = new Subject<Notification>();
  newNotification$ = this.newNotificationSubject.asObservable();

  constructor(private auth: AuthService, private api: NotificationApiService) {}

  async connect(): Promise<void> {
    const token = this.auth.token();
    if (!token) return;
    if (this.client?.connected) return;
    if (this.isConnecting) return;
    this.isConnecting = true;

    const [initialList, initialUnread] = await Promise.all([
      firstValueFrom(this.api.listMine()).catch(() => [] as Notification[]),
      firstValueFrom(this.api.unreadCount()).catch(() => ({ unreadCount: 0 }))
    ]);
    this.notificationsSubject.next(initialList);
    this.unreadCountSubject.next(initialUnread.unreadCount ?? 0);

    const client = new Client({
      webSocketFactory: () => new SockJS('/ws'),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: () => {}
    });

    client.onConnect = () => {
      client.subscribe('/user/queue/notifications', (msg) => this.onMessage(msg));
      client.subscribe('/topic/notifications', (msg) => this.onMessage(msg));
      this.isConnecting = false;
    };
    client.onStompError = () => {
      this.isConnecting = false;
    };
    client.onWebSocketClose = () => {
      this.isConnecting = false;
    };

    this.client = client;
    client.activate();
  }

  disconnect(): void {
    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }
    this.isConnecting = false;
    this.notificationsSubject.next([]);
    this.unreadCountSubject.next(0);
  }

  async markRead(id: number): Promise<void> {
    await firstValueFrom(this.api.markRead(id)).catch(() => undefined);
    const current = this.notificationsSubject.getValue();
    const updated = current.map((n) => (n.id === id ? { ...n, lu: true } : n));
    const beforeUnread = current.filter((n) => !n.lu).length;
    const afterUnread = updated.filter((n) => !n.lu).length;
    this.notificationsSubject.next(updated);
    this.unreadCountSubject.next(Math.max(0, this.unreadCountSubject.getValue() - (beforeUnread - afterUnread)));
  }

  async markAllRead(): Promise<void> {
    await firstValueFrom(this.api.markAllRead()).catch(() => undefined);
    const current = this.notificationsSubject.getValue();
    this.notificationsSubject.next(current.map((n) => ({ ...n, lu: true })));
    this.unreadCountSubject.next(0);
  }

  async clear(): Promise<void> {
    await firstValueFrom(this.api.clear()).catch(() => undefined);
    this.notificationsSubject.next([]);
    this.unreadCountSubject.next(0);
  }

  private onMessage(msg: IMessage) {
    try {
      const parsed = JSON.parse(msg.body) as Notification;
      const current = this.notificationsSubject.getValue();
      this.notificationsSubject.next([parsed, ...current].slice(0, 50));
      if (!parsed.lu) this.unreadCountSubject.next(this.unreadCountSubject.getValue() + 1);
      this.newNotificationSubject.next(parsed);
    } catch {
      return;
    }
  }
}
