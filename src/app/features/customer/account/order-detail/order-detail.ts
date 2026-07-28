import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { injectQuery, injectMutation, injectQueryClient } from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';
import { OrderService } from '../../../../core/services/order.service';
import { ReturnRequestService } from '../../../../core/services/return-request.service';
import { CreateReturnRequestDto } from '../../../../core/models/return-request.model';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.css'
})
export class OrderDetailComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private orderService = inject(OrderService);
  private returnService = inject(ReturnRequestService);
  private queryClient = injectQueryClient();

  apiUrl = environment.apiUrl;
  orderId = signal<string>('');

  // Return Request Modal Signals
  showReturnModal = signal<boolean>(false);
  selectedReturnItem = signal<any | null>(null);
  returnQuantity = signal<number>(1);
  customerReason = signal<string>('Defective item / Wrong size received');
  customerNotes = signal<string>('');
  submitError = signal<string>('');

  constructor() {
    this.route.params.subscribe((params) => {
      if (params['id']) {
        this.orderId.set(params['id']);
      }
    });
  }

  // TanStack Query for Order Details
  orderDetailsQuery = injectQuery(() => {
    const id = this.orderId();
    return {
      queryKey: ['orderDetails', id],
      queryFn: () => lastValueFrom(this.orderService.getOrderById(id)),
      enabled: !!id
    };
  });

  // Create Return Mutation
  createReturnMutation = injectMutation(() => ({
    mutationFn: (dto: CreateReturnRequestDto) =>
      lastValueFrom(this.returnService.createReturnRequest(dto)),
    onSuccess: () => {
      this.queryClient.invalidateQueries({ queryKey: ['myReturnRequests'] });
      alert('Return ticket submitted successfully! Our support team will review your request.');
      this.closeReturnModal();
      this.router.navigate(['/orders/returns']);
    },
    onError: (err: any) => {
      console.error('Failed to submit return request:', err);
      const msg = err.error?.message || err.message || 'Error submitting return ticket.';
      this.submitError.set(msg);
    }
  }));

  openReturnModal(item: any): void {
    this.selectedReturnItem.set(item);
    this.returnQuantity.set(1);
    this.customerReason.set('Defective item / Wrong size received');
    this.customerNotes.set('');
    this.submitError.set('');
    this.showReturnModal.set(true);
  }

  closeReturnModal(): void {
    this.showReturnModal.set(false);
    this.selectedReturnItem.set(null);
  }

  submitReturn(): void {
    const item = this.selectedReturnItem();
    if (!item) return;

    const variantId = item.variantId || item.productVariantId || item.id;
    const dto: CreateReturnRequestDto = {
      orderId: this.orderId(),
      variantId,
      quantity: this.returnQuantity(),
      customerReason: this.customerReason(),
      customerNotes: this.customerNotes().trim() || undefined
    };

    this.createReturnMutation.mutate(dto);
  }

  getItemImage(item: any): string {
    if (item.imageUrl) {
      if (item.imageUrl.startsWith('http')) return item.imageUrl;
      return `${this.apiUrl}${item.imageUrl}`;
    }
    if (item.images && item.images.length > 0) {
      const primary = item.images.find((i: any) => i.isPrimary) || item.images[0];
      if (primary.imageUrl.startsWith('http')) return primary.imageUrl;
      return `${this.apiUrl}${primary.imageUrl}`;
    }
    return 'https://placehold.co/100x100?text=No+Image';
  }

  getStatusBadgeClass(status?: string): string {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'finished':
      case 'paid':
        return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50';
      case 'pending':
        return 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200 dark:border-amber-900/50';
      case 'shipped':
      case 'processing':
        return 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/50';
      case 'cancelled':
        return 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400 border-red-200 dark:border-red-900/50';
      default:
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200';
    }
  }

  isStepActive(status: string, targetStep: string): boolean {
    const s = status?.toLowerCase();
    if (s === 'completed' || s === 'finished') return true;
    if (targetStep === 'placed') return true;
    if (targetStep === 'pending' && (s === 'pending' || s === 'paid' || s === 'shipped' || s === 'delivered' || s === 'finished')) return true;
    if (targetStep === 'processing' && (s === 'paid' || s === 'shipped' || s === 'delivered' || s === 'finished')) return true;
    if (targetStep === 'completed' && (s === 'delivered' || s === 'finished')) return true;
    return false;
  }
}
