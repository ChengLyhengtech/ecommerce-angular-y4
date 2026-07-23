import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WishlistService } from '../../../core/services/wishlist.service';
import { ProductCardComponent } from '../../../shared/components/product-card/product-card';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [CommonModule, RouterLink, ProductCardComponent],
  templateUrl: './wishlist.html',
  styleUrl: './wishlist.css'
})
export class WishlistComponent implements OnInit {
  wishlistService = inject(WishlistService);

  ngOnInit(): void {
    this.wishlistService.loadWishlist().subscribe();
  }
}
