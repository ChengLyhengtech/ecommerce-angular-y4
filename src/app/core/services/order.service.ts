import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  OrderQueryDto, 
  OrderHistoryResponseDto, 
  OrderDetailsResponseDto, 
  PaginatedList
} from '../models/order.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/orders`;

  getOrders(query: OrderQueryDto): Observable<PaginatedList<OrderHistoryResponseDto>> {
    let params = new HttpParams();
    
    if (query.status) {
      params = params.set('status', query.status);
    }
    if (query.searchTerm) {
      params = params.set('searchTerm', query.searchTerm);
    }
    if (query.sortBy) {
      params = params.set('sortBy', query.sortBy);
    }
    if (query.isDescending !== undefined) {
      params = params.set('isDescending', query.isDescending.toString());
    }
    if (query.pageNumber) {
      params = params.set('pageNumber', query.pageNumber.toString());
    }
    if (query.pageSize) {
      params = params.set('pageSize', query.pageSize.toString());
    }

    return this.http.get<PaginatedList<OrderHistoryResponseDto>>(this.apiUrl, { params });
  }

  getOrderById(id: string): Observable<OrderDetailsResponseDto> {
    return this.http.get<OrderDetailsResponseDto>(`${this.apiUrl}/${id}`);
  }

  updateOrderStatus(id: string, status: string): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/${id}/status`, { status });
  }
}
