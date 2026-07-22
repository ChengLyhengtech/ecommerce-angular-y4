export interface ReturnRequestTicket {
  id: string;
  orderId: string;
  productVariantId: string;
  quantity: number;
  customerReason: string;
  customerNotes?: string;
  adminNotes?: string;
  status: 'PendingReview' | 'Approved' | 'Rejected';
  createdAt: string;
  // UI helper fields
  productName?: string;
  sku?: string;
}

export interface ReturnRequestReviewDto {
  status: 'Approved' | 'Rejected';
  adminNotes: string;
  isRestockable: boolean;
}
