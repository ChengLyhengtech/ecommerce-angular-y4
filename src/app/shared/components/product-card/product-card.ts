import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Product } from '../../../core/models/product.model';
import { CartService } from '../../../core/services/cart.service';
import { WishlistService } from '../../../core/services/wishlist.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './product-card.html',
  styleUrl: './product-card.css'
})
export class ProductCardComponent {
  @Input({ required: true }) product!: Product;

  cartService = inject(CartService);
  wishlistService = inject(WishlistService);
  apiUrl = environment.apiUrl;

  getImageUrl(url?: string): string {
    if (!url) return 'https://placehold.co/400x500?text=Product';
    if (url.startsWith('http')) return url;
    return `${this.apiUrl}${url}`;
  }

  getPrimaryImage(): string {
    if (this.product.images && this.product.images.length > 0) {
      const primary = this.product.images.find((i) => i.isPrimary);
      return this.getImageUrl(primary ? primary.imageUrl : this.product.images[0].imageUrl);
    }
    return 'https://placehold.co/400x500?text=No+Image';
  }

  get isWishlisted(): boolean {
    return this.wishlistService.isWishlisted(this.product.id);
  }

  toggleWishlist(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.wishlistService.toggleWishlist(this.product.id).subscribe();
  }

  quickAddToCart(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    if (this.product.variants && this.product.variants.length > 0) {
      const variant = this.product.variants.find((v) => v.availableStock > 0) || this.product.variants[0];
      this.cartService.addToCart(variant.id, 1).subscribe({
        next: () => {
          this.cartService.openDrawer();
        }
      });
    }
  }

  // Extract unique color swatches from variants
  get variantColors(): string[] {
    if (!this.product.variants) return [];
    const colors = new Set<string>();
    this.product.variants.forEach((v) => {
      if (v.color) colors.add(v.color.trim());
    });
    return Array.from(colors).slice(0, 5); // limit to 5 swatches
  }

  getColorHex(colorName: string): string {
    const c = colorName.toLowerCase();
    if (c.includes('black')) return '#0f172a';
    if (c.includes('white')) return '#ffffff';
    if (c.includes('red')) return '#ef4444';
    if (c.includes('blue')) return '#3b82f6';
    if (c.includes('light blue') || c.includes('sky')) return '#a5f3fc';
    if (c.includes('pink')) return '#fbcfe8';
    if (c.includes('yellow')) return '#fef08a';
    if (c.includes('green')) return '#22c55e';
    if (c.includes('beige') || c.includes('cream')) return '#fef3c7';
    if (c.includes('purple')) return '#a855f7';
    if (c.includes('grey') || c.includes('gray')) return '#94a3b8';
    return '#cbd5e1'; // default slate-300
  }
}
