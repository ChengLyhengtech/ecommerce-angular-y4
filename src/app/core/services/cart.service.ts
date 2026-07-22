import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { Cart, AddToCartDto, UpdateCartItemDto } from '../models/cart.model';
import { environment } from '../../../environments/environment';

const DEFAULT_USER_ID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/cart`;

  // Reactive Cart state
  cart = signal<Cart | null>(null);
  isLoading = signal<boolean>(false);
  isDrawerOpen = signal<boolean>(false);

  // Computed totals
  cartItemsCount = computed(() => {
    const currentCart = this.cart();
    if (!currentCart || !currentCart.items) return 0;
    return currentCart.items.reduce((total, item) => total + item.quantity, 0);
  });

  cartSubtotal = computed(() => {
    const currentCart = this.cart();
    if (!currentCart || !currentCart.items) return 0;
    return currentCart.items.reduce((total, item) => {
      const price = item.productVariant?.finalPrice ?? item.productVariant?.product?.finalPrice ?? item.productVariant?.basePrice ?? item.productVariant?.product?.basePrice ?? 0;
      return total + (price * item.quantity);
    }, 0);
  });

  getUserId(): string {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('userId');
      if (savedUser) return savedUser;
    }
    return DEFAULT_USER_ID;
  }

  loadCart(userId?: string): Observable<Cart | null> {
    const targetUserId = userId || this.getUserId();
    this.isLoading.set(true);
    return this.http.get<Cart>(`${this.apiUrl}/user/${targetUserId}`).pipe(
      tap((cartData) => {
        this.cart.set(cartData);
        this.isLoading.set(false);
      }),
      catchError((error) => {
        console.error('Error fetching cart:', error);
        this.cart.set({
          id: '',
          userId: targetUserId,
          updatedAt: new Date().toISOString(),
          items: []
        });
        this.isLoading.set(false);
        return of(null);
      })
    );
  }

  addToCart(productVariantId: string, quantity: number = 1): Observable<{ message: string }> {
    const dto: AddToCartDto = {
      userId: this.getUserId(),
      productVariantId,
      quantity
    };
    return this.http.post<{ message: string }>(`${this.apiUrl}/add`, dto).pipe(
      tap(() => {
        // Refresh cart after adding item
        this.loadCart().subscribe();
      })
    );
  }

  updateItemQuantity(cartItemId: string, quantity: number): Observable<void> {
    const dto: UpdateCartItemDto = { quantity };
    return this.http.put<void>(`${this.apiUrl}/item/${cartItemId}`, dto).pipe(
      tap(() => {
        this.loadCart().subscribe();
      })
    );
  }

  removeFromCart(cartItemId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/item/${cartItemId}`).pipe(
      tap(() => {
        this.loadCart().subscribe();
      })
    );
  }

  toggleDrawer(): void {
    this.isDrawerOpen.update((open) => !open);
  }

  openDrawer(): void {
    this.isDrawerOpen.set(true);
  }

  closeDrawer(): void {
    this.isDrawerOpen.set(false);
  }
}
