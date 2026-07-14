import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Brand, BrandCreateDto, BrandUpdateDto } from '../models/brand.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BrandService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/brands`;

  getBrands(): Observable<Brand[]> {
    return this.http.get<Brand[]>(this.apiUrl);
  }

  getBrandById(id: string): Observable<Brand> {
    return this.http.get<Brand>(`${this.apiUrl}/${id}`);
  }

  createBrand(data: BrandCreateDto): Observable<Brand> {
    const formData = new FormData();
    formData.append('Name', data.name);
    formData.append('LogoImage', data.logoImage);
    
    return this.http.post<Brand>(this.apiUrl, formData);
  }

  updateBrand(id: string, data: BrandUpdateDto): Observable<Brand> {
    const formData = new FormData();
    formData.append('Name', data.name);
    if (data.logoImage) {
      formData.append('LogoImage', data.logoImage);
    }
    
    return this.http.put<Brand>(`${this.apiUrl}/${id}`, formData);
  }

  deleteBrand(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
