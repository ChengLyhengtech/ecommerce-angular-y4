import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { InventoryAdjustmentDto, InventoryCorrectionDto } from '../models/inventory.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/Inventory`;

  restock(data: InventoryAdjustmentDto): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/restock`, data);
  }

  discard(data: InventoryAdjustmentDto): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/discard`, data);
  }

  returnStock(data: InventoryAdjustmentDto): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/return`, data);
  }

  correct(data: InventoryCorrectionDto): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/correct`, data);
  }
}
