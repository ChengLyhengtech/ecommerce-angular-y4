import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { NotificationService } from '../../../core/services/notification.service';
import { NotificationItem } from '../../../core/models/notification.model';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css',
})
export class AdminLayoutComponent implements OnInit, OnDestroy {
  notificationService = inject(NotificationService);
  private router = inject(Router);

  isSidebarCollapsed = typeof window !== 'undefined' ? localStorage.getItem('sidebarCollapsed') === 'true' : false;
  isMobileSidebarOpen = false;

  // Dark/Light Mode state
  isDarkMode = signal<boolean>(false);

  // Notification Dropdown state
  isNotificationDropdownOpen = signal<boolean>(false);

  // Live Cambodia Clock Signal
  cambodiaTime = signal<string>('');
  private timerId: any;

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('adminTheme');
      this.isDarkMode.set(savedTheme === 'dark');

      this.updateTime();

      this.timerId = setInterval(() => {
        this.updateTime();
      }, 1000);
    }
  }

  ngOnDestroy(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
    }
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarCollapsed', this.isSidebarCollapsed.toString());
    }
  }

  toggleMobileSidebar(): void {
    this.isMobileSidebarOpen = !this.isMobileSidebarOpen;
  }

  closeMobileSidebar(): void {
    this.isMobileSidebarOpen = false;
  }

  toggleTheme(): void {
    this.isDarkMode.update((dark) => !dark);
    if (typeof window !== 'undefined') {
      localStorage.setItem('adminTheme', this.isDarkMode() ? 'dark' : 'light');
    }
  }

  // Notification Handlers
  toggleNotificationDropdown(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.isNotificationDropdownOpen.update((open) => !open);
  }

  closeNotificationDropdown(): void {
    this.isNotificationDropdownOpen.set(false);
  }

  markAllNotificationsAsRead(): void {
    this.notificationService.markAllAsRead().subscribe();
  }

  onNotificationClick(notification: NotificationItem): void {
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id).subscribe();
    }
    this.isNotificationDropdownOpen.set(false);
    if (notification.targetUrl) {
      this.router.navigateByUrl(notification.targetUrl);
    }
  }

  getNotificationIconClass(type: string): string {
    switch (type) {
      case 'NewOrder':
        return 'icon-order';
      case 'LowStock':
        return 'icon-stock';
      case 'ReturnRequest':
        return 'icon-return';
      default:
        return 'icon-default';
    }
  }

  dismissToast(): void {
    this.notificationService.dismissToast();
  }

  private updateTime(): void {
    try {
      const now = new Date();

      const timeOptions: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Phnom_Penh',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      };

      const dateOptions: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Phnom_Penh',
        month: 'numeric',
        day: 'numeric',
        year: 'numeric'
      };

      const timeFormatter = new Intl.DateTimeFormat('en-US', timeOptions);
      const dateFormatter = new Intl.DateTimeFormat('en-US', dateOptions);

      const timeString = timeFormatter.format(now);
      const dateString = dateFormatter.format(now);

      this.cambodiaTime.set(`${timeString} ${dateString}`);
    } catch (e) {
      this.cambodiaTime.set(new Date().toLocaleString());
    }
  }
}