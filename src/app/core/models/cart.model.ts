export interface CartProductVariant {
  id: string;
  color: string;
  size: string;
  sku: string;
  availableStock?: number;
  productName?: string;
  productImage?: string;
  basePrice?: number;
  finalPrice?: number;
  isDiscounted?: boolean;
  discountPercentage?: number;
  product?: {
    id: string;
    name: string;
    description?: string;
    basePrice: number;
    discountPercentage: number;
    finalPrice: number;
    isDiscounted: boolean;
    categoryName?: string;
    brandName?: string;
    images?: { id?: string; imageUrl: string; isPrimary: boolean }[];
  };
}

export interface CartItem {
  id: string;
  cartId: string;
  productVariantId: string;
  quantity: number;
  productVariant: CartProductVariant;
}

export interface Cart {
  id: string;
  userId: string;
  updatedAt: string;
  items: CartItem[];
}

export interface AddToCartDto {
  userId: string;
  productVariantId: string;
  quantity: number;
}

export interface UpdateCartItemDto {
  quantity: number;
}
