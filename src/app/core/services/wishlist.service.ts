import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of, forkJoin } from 'rxjs';
import { WishlistItem } from '../models/wishlist.model';
import { environment } from '../../../environments/environment';

const GUEST_WISHLIST_KEY = 'guest_wishlist';

@Injectable({
  providedIn: 'root'
})
export class WishlistService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/wishlist`;

  // Signal storing set of wishlisted product IDs
  wishlistIds = signal<Set<string>>(new Set());
  wishlistItems = signal<WishlistItem[]>([]);
  isLoading = signal<boolean>(false);

  constructor() {
    this.initWishlist();
  }

  private isUserLoggedIn(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('token');
  }

  getGuestWishlistIds(): string[] {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem(GUEST_WISHLIST_KEY);
    if (!saved) return [];
    try {
      return JSON.parse(saved) || [];
    } catch {
      return [];
    }
  }

  private saveGuestWishlistIds(ids: string[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(ids));
    }
  }

  initWishlist(): void {
    this.loadWishlist().subscribe();
  }

  loadWishlist(): Observable<WishlistItem[]> {
    this.isLoading.set(true);

    if (!this.isUserLoggedIn()) {
      const guestIds = this.getGuestWishlistIds();
      this.wishlistIds.set(new Set(guestIds));
      this.wishlistItems.set([]);
      this.isLoading.set(false);
      return of([]);
    }

    return this.http.get<WishlistItem[]>(this.apiUrl).pipe(
      tap((items: WishlistItem[]) => {
        const list = items || [];
        this.wishlistItems.set(list);
        const set = new Set(list.map((i) => i.productId));
        this.wishlistIds.set(set);
        this.isLoading.set(false);
      }),
      catchError((err) => {
        console.warn('Could not load wishlist:', err);
        this.isLoading.set(false);
        return of([]);
      })
    );
  }

  isWishlisted(productId: string): boolean {
    return this.wishlistIds().has(productId);
  }

  toggleWishlist(productId: string): Observable<any> {
    if (!this.isUserLoggedIn()) {
      const currentSet = new Set(this.wishlistIds());
      if (currentSet.has(productId)) {
        currentSet.delete(productId);
      } else {
        currentSet.add(productId);
      }
      const arr = Array.from(currentSet);
      this.saveGuestWishlistIds(arr);
      this.wishlistIds.set(currentSet);
      return of({ message: 'Guest wishlist updated' });
    }

    if (this.isWishlisted(productId)) {
      return this.removeFromWishlist(productId);
    } else {
      return this.addToWishlist(productId);
    }
  }

  addToWishlist(productId: string): Observable<{ message: string }> {
    const current = new Set(this.wishlistIds());
    current.add(productId);
    this.wishlistIds.set(current);

    return this.http.post<{ message: string }>(`${this.apiUrl}/${productId}`, { productId }).pipe(
      tap(() => this.loadWishlist().subscribe()),
      catchError(() => {
        return this.http.post<{ message: string }>(this.apiUrl, { productId }).pipe(
          tap(() => this.loadWishlist().subscribe()),
          catchError((err) => {
            const set = new Set(this.wishlistIds());
            set.delete(productId);
            this.wishlistIds.set(set);
            throw err;
          })
        );
      })
    );
  }

  removeFromWishlist(productId: string): Observable<{ message: string }> {
    const current = new Set(this.wishlistIds());
    current.delete(productId);
    this.wishlistIds.set(current);

    return this.http.delete<{ message: string }>(`${this.apiUrl}/${productId}`).pipe(
      tap(() => this.loadWishlist().subscribe()),
      catchError((err) => {
        const set = new Set(this.wishlistIds());
        set.add(productId);
        this.wishlistIds.set(set);
        throw err;
      })
    );
  }

  /**
   * Post-Login Wishlist Synchronization Hook:
   * 1. Checks if localStorage contains guest_wishlist items.
   * 2. Posts guest wishlist items to /api/wishlist/sync (or fallback iteration).
   * 3. Clears guest_wishlist from localStorage.
   * 4. Fetches merged updated wishlist state from API.
   */
  syncGuestWishlist(): Observable<any> {
    const guestIds = this.getGuestWishlistIds();
    if (!guestIds || guestIds.length === 0) {
      return this.loadWishlist();
    }

    return this.http.post<any>(`${this.apiUrl}/sync`, { productIds: guestIds }).pipe(
      tap(() => {
        this.clearGuestWishlist();
        this.loadWishlist().subscribe();
      }),
      catchError(() => {
        const requests = guestIds.map((id) =>
          this.http.post(`${this.apiUrl}/${id}`, { productId: id }).pipe(
            catchError(() => this.http.post(this.apiUrl, { productId: id })),
            catchError(() => of(null))
          )
        );
        return forkJoin(requests).pipe(
          tap(() => {
            this.clearGuestWishlist();
            this.loadWishlist().subscribe();
          })
        );
      })
    );
  }

  clearGuestWishlist(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(GUEST_WISHLIST_KEY);
    }
  }
}
