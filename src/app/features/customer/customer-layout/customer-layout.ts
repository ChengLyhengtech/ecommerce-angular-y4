import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../../core/services/cart.service';
import { CartDrawerComponent } from '../cart-drawer/cart-drawer';

@Component({
  selector: 'app-customer-layout',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet, 
    RouterLink, 
    RouterLinkActive, 
    FormsModule,
    CartDrawerComponent
  ],
  templateUrl: './customer-layout.html',
  styleUrl: './customer-layout.css'
})
export class CustomerLayoutComponent implements OnInit {
  cartService = inject(CartService);
  private router = inject(Router);

  isDarkMode = signal<boolean>(false);
  searchQuery = signal<string>('');
  isMobileMenuOpen = signal<boolean>(false);

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('customerTheme');
      this.isDarkMode.set(savedTheme === 'dark');
      this.applyTheme(this.isDarkMode());
    }

    // Load cart on layout init
    this.cartService.loadCart().subscribe();
  }

  toggleTheme(): void {
    const nextState = !this.isDarkMode();
    this.isDarkMode.set(nextState);
    if (typeof window !== 'undefined') {
      localStorage.setItem('customerTheme', nextState ? 'dark' : 'light');
    }
    this.applyTheme(nextState);
  }

  private applyTheme(isDark: boolean): void {
    if (typeof document !== 'undefined') {
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }

  onSearchSubmit(): void {
    const query = this.searchQuery().trim();
    if (query) {
      this.router.navigate(['/products'], { queryParams: { search: query } });
      this.searchQuery.set('');
      this.isMobileMenuOpen.set(false);
    }
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update((v) => !v);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }
}
