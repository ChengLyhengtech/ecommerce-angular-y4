import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../../core/services/cart.service';
import { WishlistService } from '../../../core/services/wishlist.service';
import { AuthService } from '../../../core/services/auth.service';
import { WishlistItem } from '../../../core/models/wishlist.model';
import { ProductVariant } from '../../../core/models/product.model';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-cart-drawer',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './cart-drawer.html',
  styleUrl: './cart-drawer.css'
})
export class CartDrawerComponent implements OnInit {
  cartService = inject(CartService);
  wishlistService = inject(WishlistService);
  authService = inject(AuthService);
  private router = inject(Router);
  apiUrl = environment.apiUrl;

  // Active drawer tab: 'bag' or 'wishlist'
  activeTab = signal<'bag' | 'wishlist'>('bag');

  // Track selected variant per wishlisted product ID
  selectedVariantsMap = signal<Record<string, string>>({});
  addingToBagMap = signal<Record<string, boolean>>({});

  ngOnInit(): void {
    this.wishlistService.loadWishlist().subscribe();
  }

  setTab(tab: 'bag' | 'wishlist'): void {
    this.activeTab.set(tab);
    if (tab === 'wishlist') {
      this.wishlistService.loadWishlist().subscribe();
    }
  }

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

  getProductPrimaryImage(product: any): string {
    if (product.images && product.images.length > 0) {
      const primary = product.images.find((i: any) => i.isPrimary);
      return this.getImageUrl(primary ? primary.imageUrl : product.images[0].imageUrl);
    }
    return 'https://placehold.co/300x400?text=No+Image';
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

  removeFromWishlist(event: Event, productId: string): void {
    event.stopPropagation();
    event.preventDefault();
    this.wishlistService.removeFromWishlist(productId).subscribe();
  }

  onVariantSelect(productId: string, variantId: string): void {
    const current = { ...this.selectedVariantsMap() };
    current[productId] = variantId;
    this.selectedVariantsMap.set(current);
  }

  getSelectedVariantId(wishlistItem: WishlistItem): string {
    const map = this.selectedVariantsMap();
    if (map[wishlistItem.productId]) {
      return map[wishlistItem.productId];
    }
    const variants = wishlistItem.product?.variants;
    if (variants && variants.length > 0) {
      const avail = variants.find((v) => v.availableStock > 0) || variants[0];
      return avail.id;
    }
    return '';
  }

  addWishlistItemToBag(wishlistItem: WishlistItem): void {
    const variantId = this.getSelectedVariantId(wishlistItem);
    if (!variantId) return;

    const addingMap = { ...this.addingToBagMap(), [wishlistItem.productId]: true };
    this.addingToBagMap.set(addingMap);

    this.cartService.addToCart(variantId, 1).subscribe({
      next: () => {
        const doneMap = { ...this.addingToBagMap(), [wishlistItem.productId]: false };
        this.addingToBagMap.set(doneMap);
      },
      error: () => {
        const doneMap = { ...this.addingToBagMap(), [wishlistItem.productId]: false };
        this.addingToBagMap.set(doneMap);
      }
    });
  }

  close(): void {
    this.cartService.closeDrawer();
  }

  proceedToCheckout(): void {
    this.close();
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/checkout' } });
    } else {
      this.router.navigate(['/checkout']);
    }
  }
}
