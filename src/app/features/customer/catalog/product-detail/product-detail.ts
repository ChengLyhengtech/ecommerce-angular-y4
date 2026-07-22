import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';
import { ProductService } from '../../../../core/services/product.service';
import { CartService } from '../../../../core/services/cart.service';
import { Product, ProductVariant } from '../../../../core/models/product.model';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css'
})
export class ProductDetailComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productService = inject(ProductService);
  cartService = inject(CartService);

  apiUrl = environment.apiUrl;
  productId = signal<string>('');

  selectedImageIndex = signal<number>(0);
  selectedVariant = signal<ProductVariant | null>(null);
  quantity = signal<number>(1);
  isAddingToCart = signal<boolean>(false);
  addedToastSuccess = signal<boolean>(false);

  constructor() {
    this.route.params.subscribe((params) => {
      if (params['id']) {
        this.productId.set(params['id']);
        this.selectedImageIndex.set(0);
        this.quantity.set(1);
      }
    });
  }

  // TanStack Query for Product Detail
  productQuery = injectQuery(() => {
    const id = this.productId();
    return {
      queryKey: ['productDetail', id],
      queryFn: async () => {
        const prod = await lastValueFrom(this.productService.getProductById(id));
        if (prod && prod.variants && prod.variants.length > 0) {
          const available = prod.variants.find((v) => v.availableStock > 0) || prod.variants[0];
          this.selectedVariant.set(available);
        }
        return prod;
      },
      enabled: !!id
    };
  });

  getImageUrl(url?: string): string {
    if (!url) return 'https://placehold.co/600x600?text=Product';
    if (url.startsWith('http')) return url;
    return `${this.apiUrl}${url}`;
  }

  selectVariant(variant: ProductVariant): void {
    this.selectedVariant.set(variant);
  }

  updateQuantity(change: number): void {
    const next = this.quantity() + change;
    const maxStock = this.selectedVariant()?.availableStock ?? 99;
    if (next >= 1 && next <= maxStock) {
      this.quantity.set(next);
    }
  }

  addToCart(): void {
    const variant = this.selectedVariant();
    if (!variant) return;

    this.isAddingToCart.set(true);
    this.cartService.addToCart(variant.id, this.quantity()).subscribe({
      next: () => {
        this.isAddingToCart.set(false);
        this.addedToastSuccess.set(true);
        setTimeout(() => this.addedToastSuccess.set(false), 3000);
        this.cartService.openDrawer();
      },
      error: (err) => {
        console.error(err);
        this.isAddingToCart.set(false);
      }
    });
  }

  buyNow(): void {
    const variant = this.selectedVariant();
    if (!variant) return;

    this.cartService.addToCart(variant.id, this.quantity()).subscribe({
      next: () => {
        this.router.navigate(['/checkout']);
      }
    });
  }
}
