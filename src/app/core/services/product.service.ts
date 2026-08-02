import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { Product, ProductCreateDto, ProductUpdateDto, ProductVariantUpdateDto, VariantCreateDto, PaginatedResponse } from '../models/product.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/products`;

  getProducts(filters?: { 
    brandId?: string;
    categoryId?: string; 
    hasDiscount?: boolean; 
    search?: string; 
    minPrice?: number;
    maxPrice?: number;
    targetGender?: number | string;
    pageNumber?: number; 
    pageSize?: number; 
  }): Observable<PaginatedResponse<Product>> {
    let params = new HttpParams();
    if (filters?.brandId) {
      params = params.set('brandId', filters.brandId);
    }
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
    if (filters?.targetGender !== undefined && filters.targetGender !== '') {
      params = params.set('targetGender', filters.targetGender.toString());
    }
    if (filters?.pageNumber !== undefined) {
      params = params.set('pageNumber', filters.pageNumber.toString());
    }
    if (filters?.pageSize !== undefined) {
      params = params.set('pageSize', filters.pageSize.toString());
    }

    const fallback: PaginatedResponse<Product> = {
      items: [],
      pageNumber: filters?.pageNumber || 1,
      pageSize: filters?.pageSize || 10,
      totalCount: 0,
      totalPages: 0
    };

    return this.http.get<PaginatedResponse<Product>>(this.apiUrl, { params }).pipe(
      catchError((err) => {
        console.warn('Could not fetch products:', err);
        return of(fallback);
      })
    );
  }

  getProductsUnderPrice(price: number = 20, pageNumber: number = 1, pageSize: number = 10): Observable<PaginatedResponse<Product>> {
    let params = new HttpParams()
      .set('price', price.toString())
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    const fallback: PaginatedResponse<Product> = {
      items: [],
      pageNumber,
      pageSize,
      totalCount: 0,
      totalPages: 0
    };

    return this.http.get<PaginatedResponse<Product>>(`${this.apiUrl}/under-price`, { params }).pipe(
      catchError((err) => {
        console.warn('Could not fetch under-price products:', err);
        return of(fallback);
      })
    );
  }

  getTopSellingProducts(count: number = 10): Observable<Product[]> {
    let params = new HttpParams().set('count', count.toString());
    return this.http.get<Product[]>(`${this.apiUrl}/top-selling`, { params }).pipe(
      catchError((err) => {
        console.warn('Could not fetch top selling products:', err);
        return of([]);
      })
    );
  }

  getProductById(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`);
  }

  createProduct(data: ProductCreateDto): Observable<{ message: string; productId: string }> {
    const formData = new FormData();
    formData.append('Name', data.name);
    formData.append('Description', data.description);
    formData.append('BasePrice', data.basePrice.toString());
    if (data.discountPercentage !== undefined) {
      formData.append('DiscountPercentage', data.discountPercentage.toString());
    }
    formData.append('CategoryId', data.categoryId);
    formData.append('BrandId', data.brandId);
    if (data.targetGender !== undefined) {
      formData.append('TargetGender', data.targetGender.toString());
    }
    
    if (data.colorGroupsJson) {
      formData.append('ColorGroups', data.colorGroupsJson);
    } else if (data.colorGroups) {
      formData.append('ColorGroups', JSON.stringify(data.colorGroups));
    } else if (data.variants) {
      const groupsMap = new Map<string, any[]>();
      data.variants.forEach(v => {
        const c = v.color || 'Default';
        if (!groupsMap.has(c)) groupsMap.set(c, []);
        groupsMap.get(c)!.push({
          size: v.size,
          physicalQuantity: v.initialPhysicalQuantity,
          sku: v.sku
        });
      });
      const colorGroups = Array.from(groupsMap.entries()).map(([color, sizes]) => ({ color, sizes }));
      formData.append('ColorGroups', JSON.stringify(colorGroups));
    }

    if (data.images) {
      data.images.forEach((image) => {
        formData.append('Images', image);
      });
    }

    if (data.imageColors) {
      data.imageColors.forEach((color) => {
        formData.append('ImageColors', color);
      });
    }

    if (data.imageTargetSkus && (!data.imageColors || data.imageColors.length === 0)) {
      data.imageTargetSkus.forEach((sku) => {
        formData.append('ImageTargetSkus', sku);
      });
    }

    if (data.imageIsPrimary) {
      data.imageIsPrimary.forEach((isPrimary) => {
        formData.append('ImageIsPrimary', isPrimary.toString());
      });
    }

    return this.http.post<{ message: string; productId: string }>(this.apiUrl, formData);
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

  createProductVariant(productId: string, data: VariantCreateDto): Observable<{ message: string; id?: string }> {
    return this.http.post<{ message: string; id?: string }>(`${this.apiUrl}/${productId}/variants`, data);
  }

  uploadProductImage(productId: string, file: File, isPrimary: boolean = false, color?: string, variantId?: string): Observable<{ message: string; imageId?: string; path?: string }> {
    const formData = new FormData();
    formData.append('File', file);
    formData.append('IsPrimary', isPrimary.toString());
    if (color) {
      formData.append('Color', color);
    }
    if (variantId) {
      formData.append('ProductVariantId', variantId);
    }
    return this.http.post<{ message: string; imageId?: string; path?: string }>(`${this.apiUrl}/${productId}/images`, formData);
  }

  setProductImagePrimary(imageId: string): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/images/${imageId}/set-primary`, {});
  }

  deleteProductImage(imageId: string): Observable<{ message: string; imageId: string }> {
    return this.http.delete<{ message: string; imageId: string }>(`${this.apiUrl}/images/${imageId}`);
  }
}

