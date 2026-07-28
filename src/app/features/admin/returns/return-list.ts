import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { injectQuery, injectMutation, injectQueryClient } from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';
import { ReturnRequestService } from '../../../core/services/return-request.service';
import { ProductService } from '../../../core/services/product.service';
import { ReturnRequestTicket, ReturnRequestReviewDto } from '../../../core/models/return-request.model';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-return-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './return-list.html',
  styleUrl: './return-list.css'
})
export class ReturnListComponent {
  private returnRequestService = inject(ReturnRequestService);
  private productService = inject(ProductService);
  private queryClient = injectQueryClient();

  apiUrl = environment.apiUrl;

  // Filter by ticket status: 'PendingReview' | 'Approved' | 'Rejected' | ''
  statusFilter = signal<string>('PendingReview');

  // Review dialog state
  selectedTicket = signal<ReturnRequestTicket | null>(null);
  adminNotes = signal<string>('');
  isRestockable = signal<boolean>(true);
  reviewStatus = signal<'Approved' | 'Rejected'>('Approved');

  // TanStack Query to fetch return tickets
  returnsQuery = injectQuery(() => {
    const status = this.statusFilter();
    return {
      queryKey: ['returnRequests', status],
      queryFn: () => lastValueFrom(this.returnRequestService.getReturnRequests(status || undefined))
    };
  });

  // Query products to lookup variant name and SKU friendly displays (Fallback)
  productsQuery = injectQuery(() => ({
    queryKey: ['products-lookup'],
    queryFn: () => lastValueFrom(this.productService.getProducts({ pageSize: 250 }))
  }));

  // Resolve Return ticket mutation
  reviewMutation = injectMutation(() => ({
    mutationFn: (data: { id: string, body: ReturnRequestReviewDto }) =>
      lastValueFrom(this.returnRequestService.reviewReturnRequest(data.id, data.body)),
    onSuccess: () => {
      this.queryClient.invalidateQueries({ queryKey: ['returnRequests'] });
      this.queryClient.invalidateQueries({ queryKey: ['products-inventory'] });
      this.queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      alert('Return ticket successfully resolved!');
      this.closeReview();
    },
    onError: (err: any) => {
      console.error('Failed to resolve return ticket:', err);
      const errMsg = err?.error?.message || err?.message || 'Failed to resolve return ticket.';
      alert(`Error: ${errMsg}`);
    }
  }));

  setStatusFilter(status: string): void {
    this.statusFilter.set(status);
  }

  getItemImage(imageUrl?: string): string {
    if (!imageUrl) return 'https://placehold.co/100x100?text=No+Image';
    if (imageUrl.startsWith('http')) return imageUrl;
    return `${this.apiUrl}${imageUrl}`;
  }

  openReview(ticket: ReturnRequestTicket): void {
    this.selectedTicket.set(ticket);
    this.reviewStatus.set('Approved');
    this.isRestockable.set(true);
    this.adminNotes.set('');
  }

  closeReview(): void {
    this.selectedTicket.set(null);
  }

  submitReview(): void {
    const ticket = this.selectedTicket();
    if (!ticket) return;

    const payload: ReturnRequestReviewDto = {
      status: this.reviewStatus(),
      adminNotes: this.adminNotes() || 'No additional admin notes.',
      isRestockable: this.reviewStatus() === 'Approved' ? this.isRestockable() : false
    };

    this.reviewMutation.mutate({ id: ticket.id, body: payload });
  }

  getVariantDetails(ticket: ReturnRequestTicket): { name: string, sku: string } {
    if (ticket.productName) {
      return { name: ticket.productName, sku: ticket.sku || 'N/A' };
    }
    const products = this.productsQuery.data()?.items;
    if (products) {
      for (const prod of products) {
        const variant = prod.variants.find(v => v.id === ticket.productVariantId);
        if (variant) {
          return { name: prod.name, sku: variant.sku };
        }
      }
    }
    return { name: 'Unknown Variant', sku: ticket.productVariantId.substring(0, 8) + '...' };
  }

  getStatusBadgeClass(status: string): string {
    if (status === 'Approved') return 'badge-success';
    if (status === 'Rejected') return 'badge-danger';
    return 'badge-warning';
  }
}
