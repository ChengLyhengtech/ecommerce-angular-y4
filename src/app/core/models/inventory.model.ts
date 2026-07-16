export interface InventoryAdjustmentDto {
  variantId: string;
  quantity: number;
}

export interface InventoryCorrectionDto {
  variantId: string;
  newPhysicalQuantity: number;
}
