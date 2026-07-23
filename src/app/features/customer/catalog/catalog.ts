import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';
import { ProductService } from '../../../core/services/product.service';
import { CategoryService } from '../../../core/services/category.service';
import { BrandService } from '../../../core/services/brand.service';
import { CartService } from '../../../core/services/cart.service';
import { WishlistService } from '../../../core/services/wishlist.service';
import { ProductCardComponent } from '../../../shared/components/product-card/product-card';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ProductCardComponent],
  templateUrl: './catalog.html',
  styleUrl: './catalog.css'
})
export class CatalogComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private brandService = inject(BrandService);
  cartService = inject(CartService);
  private wishlistService = inject(WishlistService);

  apiUrl = environment.apiUrl;

  // Filter signals
  searchQuery = signal<string>('');
  selectedCategoryId = signal<string>('');
  selectedBrandId = signal<string>('');
  hasDiscountOnly = signal<boolean>(false);
  maxPriceFilter = signal<number | null>(null);
  sortBy = signal<string>('name'); // 'name', 'priceAsc', 'priceDesc'
  pageNumber = signal<number>(1);
  pageSize = signal<number>(15);

  constructor() {
    this.route.queryParams.subscribe((params) => {
      if (params['search']) this.searchQuery.set(params['search']);
      if (params['categoryId']) this.selectedCategoryId.set(params['categoryId']);
      if (params['hasDiscount']) this.hasDiscountOnly.set(params['hasDiscount'] === 'true');
      if (params['maxPrice']) this.maxPriceFilter.set(+params['maxPrice']);
      if (params['pageNumber']) this.pageNumber.set(+params['pageNumber']);
    });
  }

  ngOnInit(): void {
    this.wishlistService.loadWishlist().subscribe();
  }

  // TanStack Query for Categories
  categoriesQuery = injectQuery(() => ({
    queryKey: ['categories'],
    queryFn: () => lastValueFrom(this.categoryService.getCategories())
  }));

  // TanStack Query for Brands
  brandsQuery = injectQuery(() => ({
    queryKey: ['brands'],
    queryFn: () => lastValueFrom(this.brandService.getBrands())
  }));

  // TanStack Query for Products
  productsQuery = injectQuery(() => {
    const search = this.searchQuery();
    const categoryId = this.selectedCategoryId();
    const hasDiscount = this.hasDiscountOnly();
    const maxPrice = this.maxPriceFilter();
    const pageNumber = this.pageNumber();
    const pageSize = this.pageSize();

    return {
      queryKey: ['catalogProducts', { search, categoryId, hasDiscount, maxPrice, pageNumber, pageSize }],
      queryFn: () => lastValueFrom(this.productService.getProducts({
        search: search || undefined,
        categoryId: categoryId || undefined,
        hasDiscount: hasDiscount ? true : undefined,
        maxPrice: maxPrice ?? undefined,
        pageNumber,
        pageSize
      }))
    };
  });

  get filteredProducts() {
    const response = this.productsQuery.data();
    if (!response || !response.items) return [];

    let list = [...response.items];

    // Filter by Brand locally if selected
    if (this.selectedBrandId()) {
      list = list.filter((p) => p.brandId === this.selectedBrandId());
    }

    // Sort locally
    if (this.sortBy() === 'priceAsc') {
      list.sort((a, b) => a.finalPrice - b.finalPrice);
    } else if (this.sortBy() === 'priceDesc') {
      list.sort((a, b) => b.finalPrice - a.finalPrice);
    } else if (this.sortBy() === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }

  onFilterChange(): void {
    this.pageNumber.set(1);
    this.updateQueryParams();
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedCategoryId.set('');
    this.selectedBrandId.set('');
    this.hasDiscountOnly.set(false);
    this.maxPriceFilter.set(null);
    this.sortBy.set('name');
    this.pageNumber.set(1);
    this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }

  goToPage(page: number): void {
    this.pageNumber.set(page);
    this.updateQueryParams();
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  private updateQueryParams(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        search: this.searchQuery() || null,
        categoryId: this.selectedCategoryId() || null,
        hasDiscount: this.hasDiscountOnly() ? 'true' : null,
        maxPrice: this.maxPriceFilter() ? this.maxPriceFilter() : null,
        pageNumber: this.pageNumber() > 1 ? this.pageNumber() : null
      },
      queryParamsHandling: 'merge'
    });
  }
}
