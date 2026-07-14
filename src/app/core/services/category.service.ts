import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Category, CategoryCreateDto, CategoryUpdateDto } from '../models/category.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/categories`;

  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(this.apiUrl);
  }

  getCategoryById(id: string): Observable<Category> {
    return this.http.get<Category>(`${this.apiUrl}/${id}`);
  }

  createCategory(data: CategoryCreateDto): Observable<Category> {
    const formData = new FormData();
    formData.append('Name', data.name);
    formData.append('Image', data.image);
    
    return this.http.post<Category>(this.apiUrl, formData);
  }

  updateCategory(id: string, data: CategoryUpdateDto): Observable<Category> {
    const formData = new FormData();
    formData.append('Name', data.name);
    if (data.image) {
      formData.append('Image', data.image);
    }
    
    return this.http.put<Category>(`${this.apiUrl}/${id}`, formData);
  }

  deleteCategory(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
