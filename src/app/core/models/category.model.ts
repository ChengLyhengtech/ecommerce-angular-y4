export interface Category {
  id: string;
  name: string;
  imageUrl: string;
  productCount?: number;
  status?: string;
}

export interface CategoryCreateDto {
  name: string;
  image: File;
}

export interface CategoryUpdateDto {
  name: string;
  image?: File;
}
