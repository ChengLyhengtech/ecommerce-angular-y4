import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CreateReturnRequestDto,
  ReturnRequestTicket,
  ReturnRequestReviewDto,
  ReviewReturnResponseDto
} from '../models/return-request.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReturnRequestService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/ReturnRequests`;

  // 🔹 Customer: 1. Create Return Request (POST /api/ReturnRequests/request)
  createReturnRequest(data: CreateReturnRequestDto): Observable<ReturnRequestTicket> {
    return this.http.post<ReturnRequestTicket>(`${this.apiUrl}/request`, data);
  }

  // 🔹 Customer: 2. Get My Return Requests (GET /api/ReturnRequests/my-requests)
  getMyReturnRequests(): Observable<ReturnRequestTicket[]> {
    return this.http.get<ReturnRequestTicket[]>(`${this.apiUrl}/my-requests`);
  }

  // 🛠️ Admin: 1. Get All Return Requests (GET /api/ReturnRequests?status=...)
  getReturnRequests(status?: string): Observable<ReturnRequestTicket[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<ReturnRequestTicket[]>(this.apiUrl, { params });
  }

  // 🛠️ Admin/Customer: 2. Get Specific Ticket Details (GET /api/ReturnRequests/{id})
  getReturnRequestById(id: string): Observable<ReturnRequestTicket> {
    return this.http.get<ReturnRequestTicket>(`${this.apiUrl}/${id}`);
  }

  // 🛠️ Admin: 3. Review & Resolve Return Request (PUT /api/ReturnRequests/{id}/review)
  reviewReturnRequest(id: string, data: ReturnRequestReviewDto): Observable<ReviewReturnResponseDto> {
    return this.http.put<ReviewReturnResponseDto>(`${this.apiUrl}/${id}/review`, data);
  }
}
