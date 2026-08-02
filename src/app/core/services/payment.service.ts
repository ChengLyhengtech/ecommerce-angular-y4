import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  PaymentSimulateSuccessResponse,
  CheckPaymentStatusResponse,
  GenerateKhqrRequest,
  GenerateKhqrResponse,
  KhqrDeeplinkRequest,
  KhqrDeeplinkResponse
} from '../models/payment.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  /**
   * 1. Generate KHQR Payment & Invoice
   * HTTP Method: POST
   * Endpoint: /api/generate-khqr
   */
  generateKhqr(req: GenerateKhqrRequest): Observable<GenerateKhqrResponse> {
    return this.http.post<GenerateKhqrResponse>(`${this.apiUrl}/api/generate-khqr`, req);
  }

  /**
   * 2. Get Rendered QR Code Image (PNG) URL
   * HTTP Method: GET
   * Endpoint: /api/qr-image/{invoice} (Accepts Invoice, MD5, or OrderId)
   */
  getQrImageUrl(invoiceOrMd5OrOrderId: string): string {
    if (!invoiceOrMd5OrOrderId) return '';
    return `${this.apiUrl}/api/qr-image/${encodeURIComponent(invoiceOrMd5OrOrderId)}`;
  }

  /**
   * 3. Check Payment Status (Polling Endpoint)
   * HTTP Method: GET ONLY
   * Endpoint: /api/check-payment/{invoice} (Accepts Invoice, MD5, or OrderId)
   */
  checkPaymentStatus(invoiceOrMd5OrOrderId: string): Observable<CheckPaymentStatusResponse> {
    if (!invoiceOrMd5OrOrderId) {
      throw new Error('Identifier required for checkPaymentStatus');
    }
    return this.http.get<CheckPaymentStatusResponse>(
      `${this.apiUrl}/api/check-payment/${encodeURIComponent(invoiceOrMd5OrOrderId)}`
    );
  }

  /**
   * 4. Generate Mobile App DeepLink (Optional for App Redirects)
   * HTTP Method: POST
   * Endpoint: /api/v1/generate_deeplink_by_qr
   */
  generateDeeplink(req: KhqrDeeplinkRequest): Observable<KhqrDeeplinkResponse> {
    return this.http.post<KhqrDeeplinkResponse>(`${this.apiUrl}/api/v1/generate_deeplink_by_qr`, req);
  }

  /**
   * 5. Developer Simulation Endpoint (Testing Without Real Money)
   * HTTP Method: POST (Executed ONLY when developer manually clicks Option A)
   * Endpoint: /api/payment/simulate-success/{orderId}
   */
  simulateSuccess(orderId: string): Observable<PaymentSimulateSuccessResponse> {
    return this.http.post<PaymentSimulateSuccessResponse>(`${this.apiUrl}/api/payment/simulate-success/${orderId}`, {});
  }

  /**
   * Legacy method for backward compatibility (using GET ONLY)
   */
  checkStatus(orderId: string, qr_md5?: string): Observable<CheckPaymentStatusResponse> {
    return this.checkPaymentStatus(orderId || qr_md5 || '');
  }

  /**
   * Legacy method for backward compatibility (using GET ONLY)
   */
  checkKhqrPayment(userId: string, qrMd5: string): Observable<CheckPaymentStatusResponse> {
    return this.checkPaymentStatus(qrMd5 || userId);
  }
}
