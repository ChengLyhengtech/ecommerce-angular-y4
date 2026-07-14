export interface ProductImage {
  id: string;
  imageUrl: string;
  isPrimary: boolean;
  productVariantId: string;
}

export interface ProductVariant {
  id: string;
  color: string;
  size: string;
  availableStock: number;
  sku: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  discountPercentage: number;
  finalPrice: number;
  isDiscounted: boolean;
  totalAvailableStock: number;
  categoryId: string;
  categoryName: string;
  brandId: string;
  brandName: string;
  variants: ProductVariant[];
  images: ProductImage[];
}

export interface VariantCreateDto {
  color: string;
  size: string;
  initialPhysicalQuantity: number;
  sku: string;
}

export interface ProductCreateDto {
  name: string;
  description: string;
  basePrice: number;
  discountPercentage?: number;
  categoryId: string;
  brandId: string;
  variants: VariantCreateDto[];
  images?: File[];
  imageTargetSkus?: string[];
  imageIsPrimary?: boolean[];
}

export interface ProductUpdateDto {
  name: string;
  description: string;
  basePrice: number;
  discountPercentage: number;
  categoryId: string;
  brandId: string;
}

export interface ProductVariantUpdateDto {
  color: string;
  size: string;
  physicalQuantity: number;
  sku: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}
