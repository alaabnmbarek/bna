export type NotificationType = 'INFO' | 'WARNING' | 'ERROR';
export type NotificationPriority = 'NORMAL' | 'URGENT';

export interface Notification {
  id: number;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  date: string;
  lu: boolean;
  utilisateurCibleId: number | null;
  resourceType: string | null;
  resourceId: number | null;
}

export interface UnreadCountResponse {
  unreadCount: number;
}
