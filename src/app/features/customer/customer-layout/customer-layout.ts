import { Component, OnInit, signal, computed, inject, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';
import { CartService } from '../../../core/services/cart.service';
import { AuthService } from '../../../core/services/auth.service';
import { ShopService } from '../../../core/services/shop.service';
import { CategoryService } from '../../../core/services/category.service';
import { CategoryTreeNode } from '../../../core/models/category.model';
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
  categoryService = inject(CategoryService);
  private router = inject(Router);
  private elementRef = inject(ElementRef);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isMegaMenuOpen() && !this.elementRef.nativeElement.contains(event.target)) {
      this.closeMegaMenu();
    }
  }

  apiUrl = environment.apiUrl;

  searchQuery = signal<string>('');
  isLeftDrawerOpen = signal<boolean>(false);
  isSearchModalOpen = signal<boolean>(false);
  isUserMenuOpen = signal<boolean>(false);

  // Active Category Tree Selection Signals
  activeRootCategoryId = signal<string | null>(null);
  activeSubCategoryId = signal<string | null>(null);

  // TanStack Query for dynamic category tree (Mega-Menu)
  categoryTreeQuery = injectQuery(() => ({
    queryKey: ['category-tree'],
    queryFn: () => lastValueFrom(this.categoryService.getCategoryTree())
  }));

  // Root categories (Level 1: MEN, WOMEN, etc.)
  rootCategories = computed<CategoryTreeNode[]>(() => {
    return this.categoryTreeQuery.data() || [];
  });

  // Active root category object
  activeRootCategory = computed<CategoryTreeNode | null>(() => {
    const roots = this.rootCategories();
    if (roots.length === 0) return null;
    const selectedId = this.activeRootCategoryId();
    if (!selectedId) return roots[0];
    return roots.find((r) => r.id === selectedId) || roots[0];
  });

  // Active level 2 subcategories under the active root category
  level2SubCategories = computed<CategoryTreeNode[]>(() => {
    const activeRoot = this.activeRootCategory();
    return activeRoot?.subCategories || [];
  });

  // Active level 2 category object selected
  activeLevel2Category = computed<CategoryTreeNode | null>(() => {
    const l2List = this.level2SubCategories();
    if (l2List.length === 0) return null;
    const selectedId = this.activeSubCategoryId();
    if (!selectedId) return l2List[0];
    return l2List.find((c) => c.id === selectedId) || l2List[0];
  });

  // Level 3 items under active level 2 category
  level3SubCategories = computed<CategoryTreeNode[]>(() => {
    const l2 = this.activeLevel2Category();
    return l2?.subCategories || [];
  });

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

  isMegaMenuOpen = signal<boolean>(false);

  selectRootCategory(id: string): void {
    this.activeRootCategoryId.set(id);
    this.isMegaMenuOpen.set(false);
    const root = this.rootCategories().find((r) => r.id === id);
    const firstL2 = root?.subCategories?.[0];
    this.activeSubCategoryId.set(firstL2 ? firstL2.id : null);
  }

  toggleSubCategory(id: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (this.activeSubCategoryId() === id && this.isMegaMenuOpen()) {
      this.isMegaMenuOpen.set(false);
    } else {
      this.activeSubCategoryId.set(id);
      this.isMegaMenuOpen.set(true);
    }
  }

  onSubCategoryHover(id: string): void {
    this.activeSubCategoryId.set(id);
    this.isMegaMenuOpen.set(true);
  }

  closeMegaMenu(): void {
    this.isMegaMenuOpen.set(false);
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

