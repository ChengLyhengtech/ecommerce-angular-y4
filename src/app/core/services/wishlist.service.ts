import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { WishlistItem } from '../models/wishlist.model';
import { environment } from '../../../environments/environment';

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

  loadWishlist(): Observable<WishlistItem[]> {
    this.isLoading.set(true);
    return this.http.get<WishlistItem[]>(this.apiUrl).pipe(
      tap((items: WishlistItem[]) => {
        this.wishlistItems.set(items || []);
        const set = new Set((items || []).map((i) => i.productId));
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

    return this.http.post<{ message: string }>(this.apiUrl, { productId }).pipe(
      tap(() => this.loadWishlist().subscribe()),
      catchError((err) => {
        const set = new Set(this.wishlistIds());
        set.delete(productId);
        this.wishlistIds.set(set);
        throw err;
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
}
