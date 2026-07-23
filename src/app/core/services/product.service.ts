import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Product, ProductCreateDto, ProductUpdateDto, ProductVariantUpdateDto, VariantCreateDto, PaginatedResponse } from '../models/product.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/products`;

  getProducts(filters?: { 
    categoryId?: string; 
    hasDiscount?: boolean; 
    search?: string; 
    minPrice?: number;
    maxPrice?: number;
    pageNumber?: number; 
    pageSize?: number; 
  }): Observable<PaginatedResponse<Product>> {
    let params = new HttpParams();
    if (filters?.categoryId) {
      params = params.set('categoryId', filters.categoryId);
    }
    if (filters?.hasDiscount !== undefined) {
      params = params.set('hasDiscount', filters.hasDiscount.toString());
    }
    if (filters?.search) {
      params = params.set('search', filters.search);
    }
    if (filters?.minPrice !== undefined) {
      params = params.set('minPrice', filters.minPrice.toString());
    }
    if (filters?.maxPrice !== undefined) {
      params = params.set('maxPrice', filters.maxPrice.toString());
    }
    if (filters?.pageNumber !== undefined) {
      params = params.set('pageNumber', filters.pageNumber.toString());
    }
    if (filters?.pageSize !== undefined) {
      params = params.set('pageSize', filters.pageSize.toString());
    }
    return this.http.get<PaginatedResponse<Product>>(this.apiUrl, { params });
  }

  getProductsUnderPrice(price: number = 20, pageNumber: number = 1, pageSize: number = 10): Observable<PaginatedResponse<Product>> {
    let params = new HttpParams()
      .set('price', price.toString())
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());
    return this.http.get<PaginatedResponse<Product>>(`${this.apiUrl}/under-price`, { params });
  }

  getTopSellingProducts(count: number = 10): Observable<Product[]> {
    let params = new HttpParams().set('count', count.toString());
    return this.http.get<Product[]>(`${this.apiUrl}/top-selling`, { params });
  }

  getProductById(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`);
  }

  createProduct(data: ProductCreateDto): Observable<{ message: string, productId: string }> {
    const formData = new FormData();
    formData.append('Name', data.name);
    formData.append('Description', data.description);
    formData.append('BasePrice', data.basePrice.toString());
    if (data.discountPercentage !== undefined) {
      formData.append('DiscountPercentage', data.discountPercentage.toString());
    }
    formData.append('CategoryId', data.categoryId);
    formData.append('BrandId', data.brandId);
    
    formData.append('Variants', JSON.stringify(data.variants));

    if (data.images) {
      data.images.forEach((image) => {
        formData.append('Images', image);
      });
    }

    if (data.imageTargetSkus) {
      data.imageTargetSkus.forEach((sku) => {
        formData.append('ImageTargetSkus', sku);
      });
    }

    if (data.imageIsPrimary) {
      data.imageIsPrimary.forEach((isPrimary) => {
        formData.append('ImageIsPrimary', isPrimary.toString());
      });
    }

    return this.http.post<{ message: string, productId: string }>(this.apiUrl, formData);
  }

  updateProductCore(id: string, data: ProductUpdateDto): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/${id}`, data);
  }

  deleteProduct(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  updateProductVariant(variantId: string, data: ProductVariantUpdateDto): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/variants/${variantId}`, data);
  }

  deleteProductVariant(variantId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/variants/${variantId}`);
  }

  createProductVariant(productId: string, data: VariantCreateDto): Observable<{ message: string, id?: string }> {
    return this.http.post<{ message: string, id?: string }>(`${this.apiUrl}/${productId}/variants`, data);
  }

  uploadProductImage(productId: string, file: File, isPrimary: boolean = false, variantId?: string): Observable<{ message: string, imageId?: string, path?: string }> {
    const formData = new FormData();
    formData.append('File', file);
    formData.append('IsPrimary', isPrimary.toString());
    if (variantId) {
      formData.append('ProductVariantId', variantId);
    }
    return this.http.post<{ message: string, imageId?: string, path?: string }>(`${this.apiUrl}/${productId}/images`, formData);
  }

  setProductImagePrimary(imageId: string): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/images/${imageId}/set-primary`, {});
  }
}
