import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';
import { BannerService } from '../../../core/services/banner.service';
import { CategoryService } from '../../../core/services/category.service';
import { ProductService } from '../../../core/services/product.service';
import { CartService } from '../../../core/services/cart.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomeComponent {
  private bannerService = inject(BannerService);
  private categoryService = inject(CategoryService);
  private productService = inject(ProductService);
  cartService = inject(CartService);

  apiUrl = environment.apiUrl;
  activeBannerIndex = signal<number>(0);

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

  // TanStack Query for New Arrivals
  latestProductsQuery = injectQuery(() => ({
    queryKey: ['latestProducts'],
    queryFn: () => lastValueFrom(this.productService.getProducts({ pageSize: 8 }))
  }));

  getImageUrl(url?: string): string {
    if (!url) return 'https://placehold.co/600x400?text=Product';
    if (url.startsWith('http')) return url;
    return `${this.apiUrl}${url}`;
  }

  getProductPrimaryImage(product: any): string {
    if (product.images && product.images.length > 0) {
      const primary = product.images.find((i: any) => i.isPrimary);
      return this.getImageUrl(primary ? primary.imageUrl : product.images[0].imageUrl);
    }
    return 'https://placehold.co/600x400?text=No+Image';
  }

  quickAddToCart(product: any, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    if (product.variants && product.variants.length > 0) {
      // Pick first available variant
      const variant = product.variants.find((v: any) => v.availableStock > 0) || product.variants[0];
      this.cartService.addToCart(variant.id, 1).subscribe({
        next: () => {
          this.cartService.openDrawer();
        }
      });
    }
  }

  nextBanner(total: number): void {
    this.activeBannerIndex.update((curr) => (curr + 1) % total);
  }

  prevBanner(total: number): void {
    this.activeBannerIndex.update((curr) => (curr - 1 + total) % total);
  }
}
