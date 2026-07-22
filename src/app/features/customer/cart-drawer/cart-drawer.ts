import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CartService } from '../../../core/services/cart.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-cart-drawer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './cart-drawer.html',
  styleUrl: './cart-drawer.css'
})
export class CartDrawerComponent {
  cartService = inject(CartService);
  apiUrl = environment.apiUrl;

  getImageUrl(url?: string): string {
    if (!url) return 'https://placehold.co/100x100?text=No+Image';
    if (url.startsWith('http')) return url;
    return `${this.apiUrl}${url}`;
  }

  getItemPrice(item: any): number {
    return item.productVariant?.finalPrice ?? item.productVariant?.product?.finalPrice ?? item.productVariant?.basePrice ?? item.productVariant?.product?.basePrice ?? 0;
  }

  getItemName(item: any): string {
    return item.productVariant?.product?.name ?? item.productVariant?.productName ?? 'Product';
  }

  getItemImage(item: any): string {
    const images = item.productVariant?.product?.images;
    if (images && images.length > 0) {
      const primary = images.find((i: any) => i.isPrimary);
      return this.getImageUrl(primary ? primary.imageUrl : images[0].imageUrl);
    }
    if (item.productVariant?.productImage) {
      return this.getImageUrl(item.productVariant.productImage);
    }
    return 'https://placehold.co/100x100?text=No+Image';
  }

  updateQuantity(cartItemId: string, currentQty: number, change: number): void {
    const newQty = currentQty + change;
    if (newQty <= 0) {
      this.cartService.removeFromCart(cartItemId).subscribe();
    } else {
      this.cartService.updateItemQuantity(cartItemId, newQty).subscribe();
    }
  }

  removeItem(cartItemId: string): void {
    this.cartService.removeFromCart(cartItemId).subscribe();
  }

  close(): void {
    this.cartService.closeDrawer();
  }
}
