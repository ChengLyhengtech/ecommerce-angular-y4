import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { Banner, BannerCreateDto, BannerUpdateDto } from '../models/banner.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BannerService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/banners`;

  getBanners(isActive?: boolean, position?: number): Observable<Banner[]> {
    let params = new HttpParams();
    if (isActive !== undefined) {
      params = params.set('isActive', isActive.toString());
    }
    if (position !== undefined) {
      params = params.set('position', position.toString());
    }
    return this.http.get<Banner[]>(this.apiUrl, { params }).pipe(
      catchError((err) => {
        console.warn('Could not fetch banners:', err);
        return of([]);
      })
    );
  }

  getBannerById(id: string): Observable<Banner> {
    return this.http.get<Banner>(`${this.apiUrl}/${id}`);
  }

  createBanner(data: BannerCreateDto): Observable<{ message: string; bannerId: string }> {
    const formData = new FormData();
    formData.append('Name', data.name);
    if (data.linkUrl) formData.append('LinkUrl', data.linkUrl);
    formData.append('Position', data.position.toString());
    if (data.sortOrder !== undefined) formData.append('SortOrder', data.sortOrder.toString());
    formData.append('DesktopImage', data.desktopImage);
    formData.append('MobileImage', data.mobileImage);

    return this.http.post<{ message: string; bannerId: string }>(this.apiUrl, formData);
  }

  updateBanner(id: string, data: BannerUpdateDto): Observable<Banner> {
    const formData = new FormData();
    formData.append('Name', data.name);
    if (data.linkUrl) formData.append('LinkUrl', data.linkUrl);
    formData.append('Position', data.position.toString());
    if (data.sortOrder !== undefined) formData.append('SortOrder', data.sortOrder.toString());
    formData.append('IsActive', data.isActive.toString());
    
    if (data.desktopImage) {
      formData.append('DesktopImage', data.desktopImage);
    }
    if (data.mobileImage) {
      formData.append('MobileImage', data.mobileImage);
    }

    return this.http.put<Banner>(`${this.apiUrl}/${id}`, formData);
  }

  toggleBannerActive(id: string): Observable<{ message: string; isActive: boolean }> {
    return this.http.patch<{ message: string; isActive: boolean }>(`${this.apiUrl}/${id}/toggle-active`, null);
  }

  deleteBanner(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }
}
