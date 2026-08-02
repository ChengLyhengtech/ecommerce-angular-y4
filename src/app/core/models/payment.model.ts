export interface GenerateKhqrRequest {
  orderId?: string;
  amount?: number;
  currency?: string;
}

export interface GenerateKhqrResponse {
  qrString?: string;
  qr_code?: string;
  md5?: string;
  qr_md5?: string;
  qrMd5?: string;
  invoice?: string;
  amount?: number;
  currency?: string;
  merchant_name?: string;
  qr_expiration?: string;
  expiration?: string;
}

export interface CheckPaymentStatusResponse {
  status?: string;
  paid?: boolean;
  success?: boolean;
  invoice?: string;
  orderId?: string;
  order_id?: string;
  amount?: number;
  currency?: string;
  paid_at?: string;
  transactionRef?: string;
  message?: string;
}

export interface PaymentSimulateSuccessResponse {
  success?: boolean;
  paid?: boolean;
  status?: string;
  message?: string;
  orderId?: string;
  order_id?: string;
  transactionRef?: string;
}

export interface KhqrDeeplinkRequest {
  qrString: string;
  sourceInfo?: {
    appIconUrl?: string;
    appName?: string;
    appDeepLinkCallback?: string;
  };
}

export interface KhqrDeeplinkResponse {
  responseCode?: number;
  responseMessage?: string;
  data?: {
    shortLink?: string;
    bakongAppDeepLink?: string;
  };
}

export interface PaymentCheckStatusRequest {
  qr_md5?: string;
  invoice?: string;
}
