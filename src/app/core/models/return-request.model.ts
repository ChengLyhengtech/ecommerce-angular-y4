export interface CreateReturnRequestDto {
  orderId: string;
  variantId: string;
  quantity: number;
  customerReason: string;
  customerNotes?: string;
}

export interface ReturnRequestTicket {
  id: string;
  orderId: string;
  productVariantId: string;
  productId?: string;
  productName?: string;
  size?: string;
  color?: string;
  sku?: string;
  imageUrl?: string;
  customerName?: string;
  customerEmail?: string;
  quantity: number;
  customerReason: string;
  customerNotes?: string;
  adminNotes?: string;
  status: 'PendingReview' | 'Approved' | 'Rejected';
  createdAt: string;
}

export interface ReturnRequestReviewDto {
  status: 'Approved' | 'Rejected';
  adminNotes: string;
  isRestockable: boolean;
}

export interface ReviewReturnResponseDto {
  message: string;
  status: string;
  adminNotes?: string;
}
