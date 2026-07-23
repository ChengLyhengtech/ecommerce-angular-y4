import { Product } from './product.model';

export interface WishlistItem {
  id: string;
  userId: string;
  productId: string;
  addedAt: string;
  product: Product;
}

export interface AddWishlistDto {
  productId: string;
}
