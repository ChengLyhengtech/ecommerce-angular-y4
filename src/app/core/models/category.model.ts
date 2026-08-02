export interface CategoryTreeNode {
  id: string;
  name: string;
  imageUrl?: string | null;
  parentCategoryId?: string | null;
  directProductCount?: number;
  totalProductCount?: number;
  status?: string;
  subCategories?: CategoryTreeNode[];
}

export interface Category {
  id: string;
  name: string;
  imageUrl?: string | null;
  parentCategoryId?: string | null;
  parentCategoryName?: string | null;
  productCount?: number;
  directProductCount?: number;
  totalProductCount?: number;
  subCategoryCount?: number;
  status?: string;
  subCategories?: CategoryTreeNode[] | Category[];
}

export interface CategoryCreateDto {
  name: string;
  parentCategoryId?: string | null;
  image?: File;
}

export interface CategoryUpdateDto {
  name: string;
  parentCategoryId?: string | null;
  image?: File;
}
