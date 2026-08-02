import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { ShopService } from '../../../core/services/shop.service';
import { NotificationItem } from '../../../core/models/notification.model';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css',
})
export class AdminLayoutComponent implements OnInit, OnDestroy {
  notificationService = inject(NotificationService);
  authService = inject(AuthService);
  shopService = inject(ShopService);
  private router = inject(Router);

  apiUrl = environment.apiUrl;

  // Global Dynamic Shop Profile Query (Cached across all components)
  shopProfileQuery = injectQuery(() => ({
    queryKey: ['shop-profile'],
    queryFn: () => lastValueFrom(this.shopService.getShopProfile()),
    staleTime: 1000 * 60 * 10
  }));

  logout(): void {
    this.authService.logout();
  }

  getImageUrl(path?: string): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${this.apiUrl}${path}`;
  }

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
    this.notificationService.dismissToast();

    const type = notification.type;
    const title = (notification.title || '').toLowerCase();
    const targetUrl = (notification.targetUrl || '').toLowerCase();

    // 1. New Order -> Navigate to admin/orders
    if (type === 'NewOrder' || title.includes('order') || targetUrl.includes('order')) {
      this.router.navigate(['/admin/orders']);
      return;
    }

    // 2. Low Stock Alert -> Navigate to admin/inventory
    if (type === 'LowStock' || title.includes('stock') || targetUrl.includes('inventory') || targetUrl.includes('stock')) {
      this.router.navigate(['/admin/inventory']);
      return;
    }

    // 3. Return Request -> Navigate to admin/returns
    if (type === 'ReturnRequest' || title.includes('return') || targetUrl.includes('return')) {
      this.router.navigate(['/admin/returns']);
      return;
    }

    // Fallback for custom targetUrl
    if (notification.targetUrl) {
      let url = notification.targetUrl;
      if (url.includes('/orders')) {
        url = '/admin/orders';
      } else if (url.includes('/inventory') || url.includes('/stock')) {
        url = '/admin/inventory';
      } else if (url.includes('/returns')) {
        url = '/admin/returns';
      } else if (!url.startsWith('/admin') && !url.startsWith('http')) {
        url = `/admin${url.startsWith('/') ? '' : '/'}${url}`;
      }
      this.router.navigateByUrl(url);
    } else {
      this.router.navigate(['/admin']);
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