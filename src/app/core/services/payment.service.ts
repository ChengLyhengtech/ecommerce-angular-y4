import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PaymentSimulateSuccessResponse, PaymentCheckStatusResponse } from '../models/payment.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/payment`;

  /**
   * Option A: Developer Test Endpoint (Simulate Success without real money)
   * POST /api/payment/simulate-success/{orderId}
   */
  simulateSuccess(orderId: string): Observable<PaymentSimulateSuccessResponse> {
    return this.http.post<PaymentSimulateSuccessResponse>(`${this.apiUrl}/simulate-success/${orderId}`, {});
  }

  /**
   * Option B: Production NBC Bakong Check
   * POST /api/payment/check-status/{orderId}
   */
  checkStatus(orderId: string, qr_md5: string): Observable<PaymentCheckStatusResponse> {
    return this.http.post<PaymentCheckStatusResponse>(`${this.apiUrl}/check-status/${orderId}`, { qr_md5 });
  }
}
