import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';
import { BannerService } from '../../../core/services/banner.service';
import { CategoryService } from '../../../core/services/category.service';
import { ProductService } from '../../../core/services/product.service';
import { CartService } from '../../../core/services/cart.service';
import { WishlistService } from '../../../core/services/wishlist.service';
import { ProductCardComponent } from '../../../shared/components/product-card/product-card';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, ProductCardComponent],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomeComponent implements OnInit {
  private bannerService = inject(BannerService);
  private categoryService = inject(CategoryService);
  private productService = inject(ProductService);
  cartService = inject(CartService);
  private wishlistService = inject(WishlistService);

  apiUrl = environment.apiUrl;
  activeBannerIndex = signal<number>(0);

  ngOnInit(): void {
    this.wishlistService.loadWishlist().subscribe();
  }

  // TanStack Query for Banners
  bannersQuery = injectQuery(() => ({
    queryKey: ['heroBanners'],
    queryFn: () => lastValueFrom(this.bannerService.getBanners(true, 1))
  }));

  // TanStack Query for Categories
  categoriesQuery = injectQuery(() => ({
    queryKey: ['homeCategories'],
    queryFn: () => lastValueFrom(this.categoryService.getCategories())
  }));

  // TanStack Query for Discounted Hot Deals
  discountedProductsQuery = injectQuery(() => ({
    queryKey: ['hotDealsProducts'],
    queryFn: () => lastValueFrom(this.productService.getProducts({ hasDiscount: true, pageSize: 6 }))
  }));

  // TanStack Query for Top Selling Products (Best Sellers)
  topSellingProductsQuery = injectQuery(() => ({
    queryKey: ['topSellingProducts'],
    queryFn: () => lastValueFrom(this.productService.getTopSellingProducts(10))
  }));

  // TanStack Query for Products Under $20
  under20ProductsQuery = injectQuery(() => ({
    queryKey: ['under20Products'],
    queryFn: () => lastValueFrom(this.productService.getProductsUnderPrice(20, 1, 8))
  }));

  // TanStack Query for New Arrivals
  latestProductsQuery = injectQuery(() => ({
    queryKey: ['latestProducts'],
    queryFn: () => lastValueFrom(this.productService.getProducts({ pageSize: 10 }))
  }));

  getImageUrl(url?: string): string {
    if (!url) return 'https://placehold.co/600x400?text=Product';
    if (url.startsWith('http')) return url;
    return `${this.apiUrl}${url}`;
  }

  nextBanner(total: number): void {
    this.activeBannerIndex.update((curr) => (curr + 1) % total);
  }

  prevBanner(total: number): void {
    this.activeBannerIndex.update((curr) => (curr - 1 + total) % total);
  }
}
