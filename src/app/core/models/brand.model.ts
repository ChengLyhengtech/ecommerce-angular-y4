export interface Brand {
  id: string;
  name: string;
  logoUrl: string;
  productCount?: number;
}

export interface BrandCreateDto {
  name: string;
  logoImage: File;
}

export interface BrandUpdateDto {
  name: string;
  logoImage?: File;
}
