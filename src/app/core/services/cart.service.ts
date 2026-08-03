import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of, forkJoin } from 'rxjs';
import { Cart, CartItem, AddToCartDto, UpdateCartItemDto, CartProductVariant } from '../models/cart.model';
import { environment } from '../../../environments/environment';

const DEFAULT_USER_ID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
const GUEST_CART_KEY = 'guest_cart';

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

  private isUserLoggedIn(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('token');
  }

  getUserId(): string {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('userId');
      if (savedUser) return savedUser;
    }
    return DEFAULT_USER_ID;
  }

  getGuestCartItems(): CartItem[] {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem(GUEST_CART_KEY);
    if (!saved) return [];
    try {
      return JSON.parse(saved) || [];
    } catch {
      return [];
    }
  }

  private saveGuestCartItems(items: CartItem[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
    }
  }

  loadCart(userId?: string): Observable<Cart | null> {
    this.isLoading.set(true);

    if (!this.isUserLoggedIn()) {
      const guestItems = this.getGuestCartItems();
      const guestCart: Cart = {
        id: 'guest-cart',
        userId: 'guest',
        updatedAt: new Date().toISOString(),
        items: guestItems
      };
      this.cart.set(guestCart);
      this.isLoading.set(false);
      return of(guestCart);
    }

    const targetUserId = userId || this.getUserId();
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

  addToCart(productVariantId: string, quantity: number = 1, variantDetails?: CartProductVariant): Observable<{ message: string }> {
    if (!this.isUserLoggedIn()) {
      const currentItems = this.getGuestCartItems();
      const existingIndex = currentItems.findIndex(i => i.productVariantId === productVariantId);

      if (existingIndex > -1) {
        currentItems[existingIndex].quantity += quantity;
      } else {
        const newItem: CartItem = {
          id: `guest-item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          cartId: 'guest-cart',
          productVariantId,
          quantity,
          productVariant: variantDetails || {
            id: productVariantId,
            color: '',
            size: '',
            sku: ''
          }
        };
        currentItems.push(newItem);
      }

      this.saveGuestCartItems(currentItems);
      this.cart.set({
        id: 'guest-cart',
        userId: 'guest',
        updatedAt: new Date().toISOString(),
        items: currentItems
      });

      return of({ message: 'Added to guest cart' });
    }

    const dto: AddToCartDto = {
      userId: this.getUserId(),
      productVariantId,
      quantity
    };

    return this.http.post<{ message: string }>(`${this.apiUrl}/add`, dto).pipe(
      tap(() => {
        this.loadCart().subscribe();
      })
    );
  }

  updateItemQuantity(cartItemId: string, quantity: number): Observable<any> {
    if (!this.isUserLoggedIn()) {
      let currentItems = this.getGuestCartItems();
      if (quantity <= 0) {
        currentItems = currentItems.filter(i => i.id !== cartItemId);
      } else {
        const item = currentItems.find(i => i.id === cartItemId);
        if (item) item.quantity = quantity;
      }
      this.saveGuestCartItems(currentItems);
      this.cart.set({
        id: 'guest-cart',
        userId: 'guest',
        updatedAt: new Date().toISOString(),
        items: currentItems
      });
      return of({ message: 'Guest cart updated' });
    }

    const dto: UpdateCartItemDto = { quantity };
    return this.http.put<void>(`${this.apiUrl}/item/${cartItemId}`, dto).pipe(
      tap(() => {
        this.loadCart().subscribe();
      })
    );
  }

  removeFromCart(cartItemId: string): Observable<any> {
    if (!this.isUserLoggedIn()) {
      const currentItems = this.getGuestCartItems().filter(i => i.id !== cartItemId);
      this.saveGuestCartItems(currentItems);
      this.cart.set({
        id: 'guest-cart',
        userId: 'guest',
        updatedAt: new Date().toISOString(),
        items: currentItems
      });
      return of({ message: 'Item removed from guest cart' });
    }

    return this.http.delete<void>(`${this.apiUrl}/item/${cartItemId}`).pipe(
      tap(() => {
        this.loadCart().subscribe();
      })
    );
  }

  /**
   * Post-Login Cart Synchronization Hook
   */
  syncGuestCart(): Observable<any> {
    const guestItems = this.getGuestCartItems();
    if (!guestItems || guestItems.length === 0) {
      return this.loadCart();
    }

    const userId = this.getUserId();
    const syncRequests = guestItems.map((item) => {
      const dto: AddToCartDto = {
        userId,
        productVariantId: item.productVariantId,
        quantity: item.quantity
      };
      return this.http.post<{ message: string }>(`${this.apiUrl}/add`, dto).pipe(
        catchError(() => of(null))
      );
    });

    return forkJoin(syncRequests).pipe(
      tap(() => {
        this.clearGuestCart();
        this.loadCart().subscribe();
      })
    );
  }

  clearGuestCart(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(GUEST_CART_KEY);
    }
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

  clearCartLocal(): void {
    this.cart.set({
      id: '',
      userId: this.getUserId(),
      updatedAt: new Date().toISOString(),
      items: []
    });
  }
}
