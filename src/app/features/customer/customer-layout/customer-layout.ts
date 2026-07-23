import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../../core/services/cart.service';
import { AuthService } from '../../../core/services/auth.service';
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
  authService = inject(AuthService);
  private router = inject(Router);

  searchQuery = signal<string>('');
  isLeftDrawerOpen = signal<boolean>(false);
  isSearchModalOpen = signal<boolean>(false);
  isUserMenuOpen = signal<boolean>(false);

  ngOnInit(): void {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('dark');
    }
    this.cartService.loadCart().subscribe();
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
