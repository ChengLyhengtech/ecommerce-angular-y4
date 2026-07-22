export interface FinancialsSummary {
  grossRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
}

export interface InventoryAlert {
  variantId: string;
  productId: string;
  productName: string;
  sku: string;
  color: string;
  size: string;
  physicalQuantity: number;
  reservedQuantity: number;
  availableStock: number;
}

export interface GeospatialLogistic {
  orderId: string;
  deliveryLatitude: number;
  deliveryLongitude: number;
  totalAmount: number;
}

export interface TopProduct {
  id: string;
  name: string;
  totalQuantitySold: number;
  totalRevenue: number;
}

export interface TopBrand {
  id: string;
  name: string;
  totalQuantitySold: number;
  totalRevenue: number;
}

export interface TopCategory {
  id: string;
  name: string;
  totalQuantitySold: number;
  totalRevenue: number;
}

export interface DashboardSummary {
  financials: FinancialsSummary;
  totalUserCount: number;
  inventoryAlerts: InventoryAlert[];
  geospatialLogistics: GeospatialLogistic[];
  topProducts: TopProduct[];
  topBrands: TopBrand[];
  topCategories: TopCategory[];
}
