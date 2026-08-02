export interface ShopLocation {
  id?: string;
  address: string;
  googleMapUrl?: string;
  latitude?: number;
  longitude?: number;
  openingHours?: string;
  updatedAt?: string;
}

export interface DynamicContact {
  id: string;
  title: string;
  profileUrl: string;
  iconUrl?: string;
  contactType?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ShopProfile {
  id?: string;
  shopName: string;
  tagline?: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  email?: string;
  phone?: string;
  address?: string;
  googleMapUrl?: string;
  latitude?: number;
  longitude?: number;
  openingHours?: string;
  updatedAt?: string;
  contacts?: DynamicContact[];
  location?: ShopLocation;
}

export interface ShopProfileUpdateDto {
  shopName: string;
  tagline?: string;
  description?: string;
  email?: string;
  phone?: string;
  logoImage?: File;
  bannerImage?: File;
}

export interface ShopLocationUpdateDto {
  address: string;
  googleMapUrl?: string;
  latitude?: number;
  longitude?: number;
  openingHours?: string;
}

export interface DynamicContactCreateDto {
  title: string;
  profileUrl: string;
  iconImage?: File;
  contactType?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface DynamicContactUpdateDto {
  title: string;
  profileUrl: string;
  iconImage?: File;
  contactType?: string;
  displayOrder?: number;
  isActive?: boolean;
}
