import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';
import { OrderService } from '../../../../core/services/order.service';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.css'
})
export class OrderDetailComponent {
  private route = inject(ActivatedRoute);
  private orderService = inject(OrderService);

  orderId = signal<string>('');

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

  getStatusBadgeClass(status?: string): string {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50';
      case 'pending':
        return 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200 dark:border-amber-900/50';
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
    if (s === 'completed') return true;
    if (targetStep === 'placed') return true;
    if (targetStep === 'pending' && (s === 'pending' || s === 'processing' || s === 'completed')) return true;
    if (targetStep === 'processing' && (s === 'processing' || s === 'completed')) return true;
    if (targetStep === 'completed' && s === 'completed') return true;
    return false;
  }
}
