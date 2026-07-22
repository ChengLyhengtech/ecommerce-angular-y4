import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ReturnRequestTicket, ReturnRequestReviewDto } from '../models/return-request.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReturnRequestService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/ReturnRequests`;

  getReturnRequests(status?: string): Observable<ReturnRequestTicket[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<ReturnRequestTicket[]>(this.apiUrl, { params });
  }

  reviewReturnRequest(id: string, data: ReturnRequestReviewDto): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}/review`, data);
  }
}
