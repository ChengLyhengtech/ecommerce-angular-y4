export interface PaymentSimulateSuccessResponse {
  success: boolean;
  message: string;
  orderId: string;
  transactionRef: string;
}

export interface PaymentCheckStatusRequest {
  qr_md5: string;
}

export interface PaymentCheckStatusResponse {
  success: boolean;
  message: string;
  orderId?: string;
  transactionRef?: string;
}
