export interface Banner {
  id: string;
  name: string;
  imageUrl: string;
  linkUrl: string;
  position: number;
  sortOrder: number;
  isActive: boolean;
}

export enum BannerPosition {
  HomePageHero = 1,
  AllProductsTop = 2,
  CartPageBottom = 3,
  PromotionPopup = 4
}

export interface BannerCreateDto {
  name: string;
  linkUrl: string;
  position: number;
  sortOrder: number;
  imageFile: File;
}

export interface BannerUpdateDto {
  name: string;
  linkUrl: string;
  position: number;
  sortOrder: number;
  isActive: boolean;
  imageFile?: File;
}

