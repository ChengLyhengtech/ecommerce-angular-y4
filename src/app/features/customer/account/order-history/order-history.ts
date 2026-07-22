import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';
import { OrderService } from '../../../../core/services/order.service';

@Component({
  selector: 'app-order-history',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './order-history.html',
  styleUrl: './order-history.css'
})
export class OrderHistoryComponent {
  private orderService = inject(OrderService);

  selectedStatus = signal<string>(''); // '', 'Pending', 'Processing', 'Completed', 'Cancelled'
  searchTerm = signal<string>('');
  pageNumber = signal<number>(1);
  pageSize = signal<number>(10);

  // TanStack Query for Order History
  ordersQuery = injectQuery(() => {
    const status = this.selectedStatus();
    const search = this.searchTerm();
    const pageNumber = this.pageNumber();
    const pageSize = this.pageSize();

    return {
      queryKey: ['customerOrders', { status, search, pageNumber, pageSize }],
      queryFn: () => lastValueFrom(this.orderService.getOrders({
        status: status || undefined,
        searchTerm: search || undefined,
        pageNumber,
        pageSize
      }))
    };
  });

  setStatusFilter(status: string): void {
    this.selectedStatus.set(status);
    this.pageNumber.set(1);
  }

  getStatusBadgeClass(status: string): string {
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

  goToPage(page: number): void {
    this.pageNumber.set(page);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}
