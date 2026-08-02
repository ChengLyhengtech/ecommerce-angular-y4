import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';
import { CartService } from '../../../core/services/cart.service';
import { AuthService } from '../../../core/services/auth.service';
import { ShopService } from '../../../core/services/shop.service';
import { CartDrawerComponent } from '../cart-drawer/cart-drawer';
import { environment } from '../../../../environments/environment';

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
  authService = inject(AuthService);
  shopService = inject(ShopService);
  private router = inject(Router);

  apiUrl = environment.apiUrl;

  searchQuery = signal<string>('');
  isLeftDrawerOpen = signal<boolean>(false);
  isSearchModalOpen = signal<boolean>(false);
  isUserMenuOpen = signal<boolean>(false);

  // TanStack Query for dynamic shop profile
  shopProfileQuery = injectQuery(() => ({
    queryKey: ['shop-profile'],
    queryFn: () => lastValueFrom(this.shopService.getShopProfile())
  }));

  // TanStack Query for dynamic active contacts
  activeContactsQuery = injectQuery(() => ({
    queryKey: ['shop-contacts'],
    queryFn: () => lastValueFrom(this.shopService.getActiveContacts())
  }));

  ngOnInit(): void {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('dark');
    }
    this.cartService.loadCart().subscribe();
  }

  getImageUrl(path?: string): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${this.apiUrl}${path}`;
  }

  toggleLeftDrawer(): void {
    this.isLeftDrawerOpen.update((open) => !open);
  }

  closeLeftDrawer(): void {
    this.isLeftDrawerOpen.set(false);
  }

  toggleSearchModal(): void {
    this.isSearchModalOpen.update((open) => !open);
  }

  closeSearchModal(): void {
    this.isSearchModalOpen.set(false);
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen.update((open) => !open);
  }

  closeUserMenu(): void {
    this.isUserMenuOpen.set(false);
  }

  logout(): void {
    this.closeUserMenu();
    this.closeLeftDrawer();
    this.authService.logout();
  }

  onSearchSubmit(): void {
    const query = this.searchQuery().trim();
    if (query) {
      this.router.navigate(['/products'], { queryParams: { search: query } });
      this.searchQuery.set('');
      this.closeLeftDrawer();
      this.closeSearchModal();
    }
  }
}

