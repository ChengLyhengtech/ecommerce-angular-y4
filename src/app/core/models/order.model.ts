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

export interface OrderItemImageDto {
  id: string;
  imageUrl: string;
  isPrimary: boolean;
  productVariantId?: string | null;
}

export interface OrderItemResponseDto {
  id: string;
  productId?: string;
  variantId?: string;
  productName: string;
  productDescription?: string;
  categoryName?: string;
  brandName?: string;
  size?: string;
  color?: string;
  sku?: string;
  imageUrl?: string;
  images?: OrderItemImageDto[];
  quantity: number;
  priceAtPurchase: number;
  subTotal?: number;
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
  paymentMethod?: string;
  qrCode?: string;
  qrMd5?: string;
  customer: CustomerSummaryDto;
  paymentDetails?: PaymentDetailsDto;
  items: OrderItemResponseDto[];
}

export interface UpdateOrderStatusDto {
  status: string;
}

export interface PlaceOrderItemDto {
  variantId: string;
  quantity: number;
}

export interface PlaceOrderDto {
  contactPhone: string;
  shippingAddress: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  items: PlaceOrderItemDto[];
}

export interface PlaceOrderResponseData {
  orderId: string;
  status?: string;
  totalAmount?: number;
  qrImage?: string;
  qrString?: string;
  qrMd5?: string;
  expiration?: string;
  merchant_name?: string;
  qr_code?: string;
  qr_md5?: string;
  amount?: number;
  currency?: string;
  qr_expiration?: string;
}

export interface PlaceOrderResponseDto {
  orderId?: string;
  status?: string;
  totalAmount?: number;
  qrImage?: string;
  qrString?: string;
  qrMd5?: string;
  expiration?: string;
  success?: boolean;
  message?: string;
  data?: PlaceOrderResponseData;
}
