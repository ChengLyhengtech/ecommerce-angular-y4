import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StockAdjustmentRequestDto, VariantHistoryDto } from '../models/inventory.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/Inventory`;

  restock(data: StockAdjustmentRequestDto): Observable<{ message: string, newPhysicalQuantity: number }> {
    return this.http.post<{ message: string, newPhysicalQuantity: number }>(`${this.apiUrl}/restock`, data);
  }

  discard(data: StockAdjustmentRequestDto): Observable<{ message: string, newPhysicalQuantity: number }> {
    return this.http.post<{ message: string, newPhysicalQuantity: number }>(`${this.apiUrl}/discard`, data);
  }

  returnStock(data: StockAdjustmentRequestDto): Observable<{ message: string, newPhysicalQuantity: number }> {
    return this.http.post<{ message: string, newPhysicalQuantity: number }>(`${this.apiUrl}/return`, data);
  }

  correct(data: StockAdjustmentRequestDto): Observable<{ message: string, newPhysicalQuantity: number }> {
    return this.http.post<{ message: string, newPhysicalQuantity: number }>(`${this.apiUrl}/correct`, data);
  }

  getVariantHistory(variantId: string): Observable<VariantHistoryDto[]> {
    return this.http.get<VariantHistoryDto[]>(`${this.apiUrl}/variants/${variantId}/history`);
  }
}
