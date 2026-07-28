import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';
import { ReturnRequestService } from '../../../../core/services/return-request.service';
import { ReturnRequestTicket } from '../../../../core/models/return-request.model';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-customer-returns',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './returns.html',
  styleUrl: './returns.css'
})
export class CustomerReturnsComponent {
  private returnService = inject(ReturnRequestService);
  apiUrl = environment.apiUrl;

  // TanStack Query for Customer Return Tickets
  returnsQuery = injectQuery(() => ({
    queryKey: ['myReturnRequests'],
    queryFn: () => lastValueFrom(this.returnService.getMyReturnRequests())
  }));

  getItemImage(imageUrl?: string): string {
    if (!imageUrl) return 'https://placehold.co/100x100?text=No+Image';
    if (imageUrl.startsWith('http')) return imageUrl;
    return `${this.apiUrl}${imageUrl}`;
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'Approved':
        return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'Rejected':
        return 'bg-red-50 text-red-600 border-red-200';
      default:
        return 'bg-amber-50 text-amber-600 border-amber-200';
    }
  }
}
