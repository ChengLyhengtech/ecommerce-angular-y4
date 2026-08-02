import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { Category, CategoryTreeNode, CategoryCreateDto, CategoryUpdateDto } from '../models/category.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/categories`;

  // Mega-Menu / Hierarchical Tree Structure Endpoint
  getCategoryTree(): Observable<CategoryTreeNode[]> {
    return this.http.get<CategoryTreeNode[]>(`${this.apiUrl}/tree`).pipe(
      catchError((err) => {
        console.warn('Could not fetch category tree:', err);
        return of([]);
      })
    );
  }

  // Flat List with optional filtering (?rootOnly=true or ?parentCategoryId={guid})
  getCategories(rootOnly?: boolean, parentCategoryId?: string): Observable<Category[]> {
    let params = new HttpParams();
    if (rootOnly !== undefined) {
      params = params.set('rootOnly', rootOnly.toString());
    }
    if (parentCategoryId) {
      params = params.set('parentCategoryId', parentCategoryId);
    }

    return this.http.get<Category[]>(this.apiUrl, { params }).pipe(
      catchError((err) => {
        console.warn('Could not fetch categories:', err);
        return of([]);
      })
    );
  }

  getCategoryById(id: string): Observable<Category> {
    return this.http.get<Category>(`${this.apiUrl}/${id}`);
  }

  createCategory(data: CategoryCreateDto): Observable<Category> {
    const formData = new FormData();
    formData.append('Name', data.name);
    if (data.parentCategoryId) {
      formData.append('ParentCategoryId', data.parentCategoryId);
    }
    if (data.image) {
      formData.append('Image', data.image);
    }

    return this.http.post<Category>(this.apiUrl, formData);
  }

  updateCategory(id: string, data: CategoryUpdateDto): Observable<Category> {
    const formData = new FormData();
    formData.append('Name', data.name);
    if (data.parentCategoryId !== undefined && data.parentCategoryId !== null) {
      formData.append('ParentCategoryId', data.parentCategoryId);
    } else {
      formData.append('ParentCategoryId', '');
    }
    if (data.image) {
      formData.append('Image', data.image);
    }

    return this.http.put<Category>(`${this.apiUrl}/${id}`, formData);
  }

  deleteCategory(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
