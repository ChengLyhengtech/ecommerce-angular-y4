export interface StockAdjustmentRequestDto {
  variantId: string;
  quantity: number;
  reasonCode: string;
  referenceId?: string;
  notes?: string;
}

export interface VariantHistoryDto {
  id: string;
  productVariantId: string;
  quantityChanged: number;
  movementType: string;
  changedBy: string;
  reasonCode: string;
  referenceId?: string;
  notes?: string;
  createdAt: string;
}
