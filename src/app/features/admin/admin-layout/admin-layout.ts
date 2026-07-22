import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-admin-layout',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css',
})
export class AdminLayoutComponent implements OnInit, OnDestroy {
  isSidebarCollapsed = typeof window !== 'undefined' ? localStorage.getItem('sidebarCollapsed') === 'true' : false;
  isMobileSidebarOpen = false;

  // Dark/Light Mode state
  isDarkMode = signal<boolean>(false);

  // 1. Fixed: Turned into a Signal so Angular tracks and reactive-updates the UI in real-time
  cambodiaTime = signal<string>('');
  private timerId: any;

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('adminTheme');
      this.isDarkMode.set(savedTheme === 'dark');

      // Run immediately on load so there's no 1-second blank delay
      this.updateTime();

      // Start live clock updates
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
    this.isDarkMode.update(dark => !dark);
    if (typeof window !== 'undefined') {
      localStorage.setItem('adminTheme', this.isDarkMode() ? 'dark' : 'light');
    }
  }

  private updateTime(): void {
    try {
      const now = new Date();

      // Options for Time (hh:mm AM/PM)
      const timeOptions: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Phnom_Penh',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true // Enabled 12-hour format with AM/PM
      };

      // Options for Date (M/D/YYYY)
      const dateOptions: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Phnom_Penh',
        month: 'numeric',
        day: 'numeric',
        year: 'numeric'
      };

      const timeFormatter = new Intl.DateTimeFormat('en-US', timeOptions);
      const dateFormatter = new Intl.DateTimeFormat('en-US', dateOptions);

      const timeString = timeFormatter.format(now); // E.g., "10:55 AM"
      const dateString = dateFormatter.format(now); // E.g., "7/16/2026"

      // Combines to exactly: "10:55 AM 7/16/2026"
      this.cambodiaTime.set(`${timeString} ${dateString}`);
    } catch (e) {
      this.cambodiaTime.set(new Date().toLocaleString());
    }
  }
}