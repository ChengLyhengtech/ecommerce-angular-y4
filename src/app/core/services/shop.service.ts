import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import {
  ShopProfile,
  ShopLocation,
  DynamicContact,
  ShopLocationUpdateDto,
  ShopProfileUpdateDto,
  DynamicContactCreateDto,
  DynamicContactUpdateDto
} from '../models/shop.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ShopService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/shop`;

  // --- A. Shop Profile Endpoints ---
  getShopProfile(): Observable<ShopProfile> {
    return this.http.get<ShopProfile>(`${this.apiUrl}/profile`).pipe(
      catchError((err) => {
        console.warn('Could not fetch shop profile:', err);
        return of({
          shopName: 'CLH168',
          description: 'Quality fashion, shoes, and accessories with instant Cambodia KHQR payments.',
          email: 'support@clh168.com',
          phone: '+855 12 345 678',
          address: 'St 2004, Phnom Penh, Cambodia',
          googleMapUrl: 'https://maps.google.com/?q=11.5564,104.9282',
          openingHours: 'Mon - Sun: 8:00 AM - 9:00 PM',
          contacts: []
        });
      })
    );
  }

  updateShopProfile(data: ShopProfileUpdateDto): Observable<ShopProfile> {
    const formData = new FormData();
    formData.append('ShopName', data.shopName);
    if (data.description !== undefined) formData.append('Description', data.description);
    if (data.email !== undefined) formData.append('Email', data.email);
    if (data.phone !== undefined) formData.append('Phone', data.phone);
    if (data.logoImage) formData.append('LogoImage', data.logoImage);
    if (data.bannerImage) formData.append('BannerImage', data.bannerImage);

    return this.http.put<ShopProfile>(`${this.apiUrl}/profile`, formData);
  }

  // --- B. Shop Location Endpoints ---
  getShopLocation(): Observable<ShopLocation> {
    return this.http.get<ShopLocation>(`${this.apiUrl}/location`).pipe(
      catchError((err) => {
        console.warn('Could not fetch shop location:', err);
        return of({
          address: 'St 2004, Phnom Penh, Cambodia',
          googleMapUrl: 'https://maps.google.com/?q=11.5564,104.9282',
          latitude: 11.5564,
          longitude: 104.9282,
          openingHours: 'Mon - Sun: 8:00 AM - 9:00 PM'
        });
      })
    );
  }

  updateShopLocation(data: ShopLocationUpdateDto): Observable<ShopLocation> {
    return this.http.put<ShopLocation>(`${this.apiUrl}/location`, data);
  }

  // --- C. Dynamic Contacts Endpoints ---
  getActiveContacts(): Observable<DynamicContact[]> {
    return this.http.get<DynamicContact[]>(`${this.apiUrl}/contacts`).pipe(
      catchError((err) => {
        console.warn('Could not fetch active shop contacts:', err);
        return of([]);
      })
    );
  }

  getAllContactsAdmin(): Observable<DynamicContact[]> {
    return this.http.get<DynamicContact[]>(`${this.apiUrl}/contacts/admin`).pipe(
      catchError((err) => {
        console.warn('Could not fetch all shop contacts (admin):', err);
        return of([]);
      })
    );
  }

  getContactById(id: string): Observable<DynamicContact> {
    return this.http.get<DynamicContact>(`${this.apiUrl}/contacts/${id}`);
  }

  createContact(data: DynamicContactCreateDto): Observable<DynamicContact> {
    const formData = new FormData();
    formData.append('Title', data.title);
    formData.append('ProfileUrl', data.profileUrl);
    if (data.iconImage) formData.append('IconImage', data.iconImage);
    if (data.contactType) formData.append('ContactType', data.contactType);
    if (data.displayOrder !== undefined) formData.append('DisplayOrder', data.displayOrder.toString());
    if (data.isActive !== undefined) formData.append('IsActive', data.isActive.toString());

    return this.http.post<DynamicContact>(`${this.apiUrl}/contacts`, formData);
  }

  updateContact(id: string, data: DynamicContactUpdateDto): Observable<DynamicContact> {
    const formData = new FormData();
    formData.append('Title', data.title);
    formData.append('ProfileUrl', data.profileUrl);
    if (data.iconImage) formData.append('IconImage', data.iconImage);
    if (data.contactType) formData.append('ContactType', data.contactType);
    if (data.displayOrder !== undefined) formData.append('DisplayOrder', data.displayOrder.toString());
    if (data.isActive !== undefined) formData.append('IsActive', data.isActive.toString());

    return this.http.put<DynamicContact>(`${this.apiUrl}/contacts/${id}`, formData);
  }

  toggleContactActive(id: string): Observable<DynamicContact> {
    return this.http.patch<DynamicContact>(`${this.apiUrl}/contacts/${id}/toggle-active`, {});
  }

  deleteContact(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/contacts/${id}`);
  }
}
