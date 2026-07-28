import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { injectQuery, injectMutation, injectQueryClient } from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';
import { OrderService } from '../../../../core/services/order.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { OrderHistoryResponseDto, OrderDetailsResponseDto, OrderItemResponseDto } from '../../../../core/models/order.model';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './order-list.html',
  styleUrl: './order-list.css',
})
export class OrderListComponent {
  private orderService = inject(OrderService);
  private notificationService = inject(NotificationService);
  private queryClient = injectQueryClient();

  apiUrl = environment.apiUrl;

  // Filter Signals
  pageNumber = signal<number>(1);
  pageSize = signal<number>(10);
  status = signal<string>('');
  searchTerm = signal<string>('');
  sortBy = signal<string>('date');
  isDescending = signal<boolean>(true);

  // Modal Signals
  selectedOrderId = signal<string | null>(null);
  showDetailsModal = signal<boolean>(false);

  constructor() {
    // Automatically invalidate & refetch order list when real-time SignalR notifications arrive
    effect(() => {
      const toast = this.notificationService.toastNotification();
      const notifs = this.notificationService.notifications();
      if (toast || notifs.length > 0) {
        this.queryClient.invalidateQueries({ queryKey: ['orders'] });
      }
    });
  }

  // TanStack Query for Order History List
  ordersQuery = injectQuery(() => {
    const page = this.pageNumber();
    const size = this.pageSize();
    const statusVal = this.status();
    const search = this.searchTerm();
    const sort = this.sortBy();
    const desc = this.isDescending();

    return {
      queryKey: ['orders', { page, size, statusVal, search, sort, desc }],
      queryFn: () => lastValueFrom(this.orderService.getOrders({
        pageNumber: page,
        pageSize: size,
        status: statusVal || undefined,
        searchTerm: search || undefined,
        sortBy: sort,
        isDescending: desc
      })),
      staleTime: 0,
      refetchOnMount: 'always' as const,
      refetchOnWindowFocus: 'always' as const
    };
  });

  // TanStack Query for detailed view (only runs when selectedOrderId is set)
  orderDetailsQuery = injectQuery(() => {
    const id = this.selectedOrderId();
    return {
      queryKey: ['orderDetails', id],
      queryFn: () => lastValueFrom(this.orderService.getOrderById(id!)),
      enabled: !!id
    };
  });

  // Status Mutation
  updateStatusMutation = injectMutation(() => ({
    mutationFn: ({ id, targetStatus }: { id: string; targetStatus: string }) => 
      lastValueFrom(this.orderService.updateOrderStatus(id, targetStatus)),
    onSuccess: () => {
      this.queryClient.invalidateQueries({ queryKey: ['orders'] });
      this.queryClient.invalidateQueries({ queryKey: ['orderDetails', this.selectedOrderId()] });
    },
    onError: (err: any) => {
      console.error('Failed to update status:', err);
      const errMsg = err?.error?.message || err?.message || 'Please try again.';
      alert(`Error updating order status: ${errMsg}`);
    }
  }));

  // Utility to determine if overall component is loading
  isLoading = () => 
    this.ordersQuery.isPending() || 
    this.ordersQuery.isFetching() ||
    this.updateStatusMutation.isPending();

  getItemImage(item: OrderItemResponseDto): string {
    if (item.imageUrl) {
      if (item.imageUrl.startsWith('http')) return item.imageUrl;
      return `${this.apiUrl}${item.imageUrl}`;
    }
    if (item.images && item.images.length > 0) {
      const primary = item.images.find(i => i.isPrimary) || item.images[0];
      if (primary.imageUrl.startsWith('http')) return primary.imageUrl;
      return `${this.apiUrl}${primary.imageUrl}`;
    }
    return 'https://placehold.co/100x100?text=No+Image';
  }

  // Search input handler
  onSearch(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchTerm.set(val);
    this.pageNumber.set(1); // Reset to first page
  }

  // Status select filter handler
  onStatusChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.status.set(val);
    this.pageNumber.set(1); // Reset to first page
  }

  // Sort change handler
  onSortChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.sortBy.set(val);
  }

  // Sort direction toggle handler
  toggleSortDirection(): void {
    this.isDescending.update(desc => !desc);
  }

  // Pagination page change handlers
  changePage(change: number): void {
    const current = this.pageNumber();
    const data = this.ordersQuery.data();
    if (!data) return;

    const target = current + change;
    if (target >= 1 && target <= data.totalPages) {
      this.pageNumber.set(target);
    }
  }

  // Page size limit change handler
  onPageSizeChange(event: Event): void {
    const val = parseInt((event.target as HTMLSelectElement).value, 10);
    this.pageSize.set(val);
    this.pageNumber.set(1); // Reset to first page
  }

  // Details Modal triggers
  openDetailsModal(id: string): void {
    this.selectedOrderId.set(id);
    this.showDetailsModal.set(true);
  }

  closeDetailsModal(): void {
    this.showDetailsModal.set(false);
    this.selectedOrderId.set(null);
  }

  // Order status transition trigger
  changeOrderStatus(targetStatus: string): void {
    const id = this.selectedOrderId();
    if (!id) return;
    
    if (confirm(`Are you sure you want to change the order status to '${targetStatus}'?`)) {
      this.updateStatusMutation.mutate({ id, targetStatus });
    }
  }

  // ID Copy utility
  copyToClipboard(text: string, event: MouseEvent): void {
    event.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      alert('Order ID copied to clipboard!');
    }).catch(err => {
      console.error('Clipboard copy error:', err);
    });
  }

  // Visual helper for status badge CSS class styling
  getStatusBadgeClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'pending': return 'badge-pending';
      case 'paid': return 'badge-paid';
      case 'shipped': return 'badge-shipped';
      case 'delivered': return 'badge-delivered';
      case 'finished': return 'badge-finished';
      case 'cancelled': return 'badge-cancelled';
      default: return 'badge-default';
    }
  }
}
