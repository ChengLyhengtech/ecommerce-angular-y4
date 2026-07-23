export enum TargetGenderFlag {
  None = 0,
  Men = 1,
  Women = 2,
  Boys = 4,
  Girls = 8,
  Unisex = 16
}

export const TARGET_GENDER_OPTIONS = [
  { value: TargetGenderFlag.Men, label: 'Men' },
  { value: TargetGenderFlag.Women, label: 'Women' },
  { value: TargetGenderFlag.Boys, label: 'Boys' },
  { value: TargetGenderFlag.Girls, label: 'Girls' },
  { value: TargetGenderFlag.Unisex, label: 'Unisex' }
];

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
  targetGender?: number;
  targetGenders?: string[];
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
  targetGender?: number | string;
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
  targetGender?: number | string;
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
