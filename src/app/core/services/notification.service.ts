import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import * as signalR from '@microsoft/signalr';
import { injectQueryClient } from '@tanstack/angular-query-experimental';
import { environment } from '../../../environments/environment';
import {
  NotificationItem,
  UnreadNotificationsResponse,
  MarkReadResponse,
  MarkAllReadResponse
} from '../models/notification.model';

@Injectable({
  providedIn: 'root'
})
export class NotificationService implements OnDestroy {
  private http = inject(HttpClient);
  private queryClient = injectQueryClient();
  private apiUrl = `${environment.apiUrl}/api/Notifications`;

  private hubConnection: signalR.HubConnection | null = null;

  // Reactive state signals
  unreadCount = signal<number>(0);
  notifications = signal<NotificationItem[]>([]);
  toastNotification = signal<NotificationItem | null>(null);
  isConnected = signal<boolean>(false);

  constructor() {
    this.fetchUnreadNotifications().subscribe();
    this.initSignalRConnection();
  }

  // A. Fetch Unread Count & Recent Notifications (GET /api/Notifications/unread)
  fetchUnreadNotifications(): Observable<UnreadNotificationsResponse | null> {
    return this.http.get<UnreadNotificationsResponse>(`${this.apiUrl}/unread`).pipe(
      tap((res) => {
        if (res) {
          this.unreadCount.set(res.unreadCount ?? 0);
          this.notifications.set(res.notifications ?? []);
        }
      }),
      catchError((err) => {
        console.error('Failed to fetch notifications:', err);
        return of(null);
      })
    );
  }

  // B. Mark Single Notification as Read (PUT /api/Notifications/{id}/read)
  markAsRead(id: string): Observable<MarkReadResponse | null> {
    return this.http.put<MarkReadResponse>(`${this.apiUrl}/${id}/read`, {}).pipe(
      tap(() => {
        this.notifications.update((list) =>
          list.map((item) => (item.id === id ? { ...item, isRead: true } : item))
        );
        this.unreadCount.update((count) => Math.max(0, count - 1));
      }),
      catchError((err) => {
        console.error(`Failed to mark notification ${id} as read:`, err);
        return of(null);
      })
    );
  }

  // C. Mark All Notifications as Read (PUT /api/Notifications/read-all)
  markAllAsRead(): Observable<MarkAllReadResponse | null> {
    return this.http.put<MarkAllReadResponse>(`${this.apiUrl}/read-all`, {}).pipe(
      tap(() => {
        this.notifications.update((list) =>
          list.map((item) => ({ ...item, isRead: true }))
        );
        this.unreadCount.set(0);
      }),
      catchError((err) => {
        console.error('Failed to mark all notifications as read:', err);
        return of(null);
      })
    );
  }

  // Real-Time SignalR WebSockets Integration
  private initSignalRConnection(): void {
    if (typeof window === 'undefined') return;

    let hubUrl = 'https://localhost:7147/hubs/notifications';
    if (environment.apiUrl) {
      hubUrl = `${environment.apiUrl}/hubs/notifications`;
    }

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () =>
          localStorage.getItem('token') || localStorage.getItem('accessToken') || localStorage.getItem('jwt_token') || ''
      })
      .withAutomaticReconnect()
      .build();

    // Event 1: ReceiveNotification (Standard Admin Alert Broadcast)
    this.hubConnection.on('ReceiveNotification', (notification: NotificationItem) => {
      console.log('📡 SignalR Real-time Notification Received:', notification);

      this.playNotificationChime();

      this.notifications.update((current) => {
        const exists = current.some((n) => n.id === notification.id);
        if (exists) {
          return current.map((n) => (n.id === notification.id ? notification : n));
        }
        return [notification, ...current];
      });

      if (!notification.isRead) {
        this.unreadCount.update((count) => count + 1);
      }

      this.toastNotification.set(notification);

      // Auto-invalidate TanStack Query caches so UI updates in real-time without requiring manual refresh
      this.queryClient.invalidateQueries({ queryKey: ['orders'] });
      this.queryClient.invalidateQueries({ queryKey: ['inventory'] });
      this.queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      this.queryClient.invalidateQueries({ queryKey: ['adminDashboard'] });

      // Auto dismiss toast after 6 seconds
      setTimeout(() => {
        if (this.toastNotification()?.id === notification.id) {
          this.toastNotification.set(null);
        }
      }, 6000);
    });

    // Event 2: ReceiveNewOrder (Broadcasted when new order is placed)
    this.hubConnection.on('ReceiveNewOrder', (data: any) => {
      console.log('📡 SignalR Real-time ReceiveNewOrder Event:', data);
      this.playNotificationChime();
      this.fetchUnreadNotifications().subscribe();
      this.queryClient.invalidateQueries({ queryKey: ['orders'] });
      this.queryClient.invalidateQueries({ queryKey: ['inventory'] });
      this.queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      this.queryClient.invalidateQueries({ queryKey: ['adminDashboard'] });
    });

    this.hubConnection
      .start()
      .then(() => {
        console.log('SignalR NotificationHub connected successfully.');
        this.isConnected.set(true);
      })
      .catch((err) => {
        console.error('Error starting SignalR connection:', err);
        this.isConnected.set(false);
      });

    this.hubConnection.onreconnecting(() => this.isConnected.set(false));
    this.hubConnection.onreconnected(() => this.isConnected.set(true));
    this.hubConnection.onclose(() => this.isConnected.set(false));
  }

  /**
   * Plays a crisp, pleasant 2-note chime sound using Web Audio API
   */
  playNotificationChime(): void {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      // Note 1 (D5 - 587.33Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
      gain1.gain.setValueAtTime(0.15, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.3);

      // Note 2 (A5 - 880Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
      gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.12);
      osc2.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.warn('Audio chime playback omitted or blocked by browser policy:', e);
    }
  }

  dismissToast(): void {
    this.toastNotification.set(null);
  }

  ngOnDestroy(): void {
    if (this.hubConnection) {
      this.hubConnection.stop();
    }
  }
}
