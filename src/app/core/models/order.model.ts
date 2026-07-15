export interface OrderQueryDto {
  status?: string;
  searchTerm?: string;
  sortBy?: string;
  isDescending?: boolean;
  pageNumber?: number;
  pageSize?: number;
}

export interface OrderHistoryResponseDto {
  id: string;
  customerName: string;
  customerEmail: string;
  orderDate: string;
  totalAmount: number;
  status: string;
  contactPhone: string;
  shippingAddress: string;
  latitude: number;
  longitude: number;
}

export interface PaginatedList<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface CustomerSummaryDto {
  id: string;
  fullName: string;
  email: string;
}

export interface PaymentDetailsDto {
  bakongTransactionRef?: string;
  status?: string;
  paidAt?: string;
}

export interface OrderItemResponseDto {
  id: string;
  productName: string;
  size?: string;
  color?: string;
  sku?: string;
  quantity: number;
  priceAtPurchase: number;
}

export interface OrderDetailsResponseDto {
  id: string;
  orderDate: string;
  totalAmount: number;
  status: string;
  contactPhone: string;
  shippingAddress: string;
  latitude: number;
  longitude: number;
  customer: CustomerSummaryDto;
  paymentDetails?: PaymentDetailsDto;
  items: OrderItemResponseDto[];
}

export interface UpdateOrderStatusDto {
  status: string;
}
