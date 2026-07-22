export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'NewOrder' | 'LowStock' | 'ReturnRequest' | string;
  targetUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export interface UnreadNotificationsResponse {
  unreadCount: number;
  notifications: NotificationItem[];
}

export interface MarkReadResponse {
  message: string;
  id: string;
}

export interface MarkAllReadResponse {
  message: string;
  count: number;
}
