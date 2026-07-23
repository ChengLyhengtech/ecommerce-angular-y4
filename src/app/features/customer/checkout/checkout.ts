import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import QRCode from 'qrcode';
import * as signalR from '@microsoft/signalr';
import { CartService } from '../../../core/services/cart.service';
import { OrderService } from '../../../core/services/order.service';
import { PaymentService } from '../../../core/services/payment.service';
import { PlaceOrderDto, PlaceOrderResponseDto } from '../../../core/models/order.model';
import { environment } from '../../../../environments/environment';

export interface NormalizedOrderQrData {
  orderId: string;
  status: string;
  totalAmount: number;
  qrImage?: string;
  qrString?: string;
  qrMd5: string;
  expiration: string;
  merchantName?: string;
  currency?: string;
}

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css'
})
export class CheckoutComponent implements OnInit, OnDestroy {
  cartService = inject(CartService);
  private orderService = inject(OrderService);
  private paymentService = inject(PaymentService);
  private router = inject(Router);

  apiUrl = environment.apiUrl;

  // Form Fields
  contactPhone = signal<string>('012345678');
  shippingAddress = signal<string>('St 210, Building 4B, Phnom Penh');
  deliveryLatitude = signal<number>(11.5564);
  deliveryLongitude = signal<number>(104.9282);

  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string>('');

  // Bakong KHQR Modal state
  showKhqrModal = signal<boolean>(false);
  khqrData = signal<NormalizedOrderQrData | null>(null);
  qrDataUrl = signal<string>('');
  
  // Timer state
  remainingSeconds = signal<number>(0);
  timerFormatted = signal<string>('15:00');
  private countdownTimer: any = null;
  copiedMd5 = signal<boolean>(false);

  // Payment Confirmation & SignalR State
  isPaymentSuccess = signal<boolean>(false);
  paymentSuccessData = signal<any>(null);
  isSimulatingPayment = signal<boolean>(false);
  isCheckingStatus = signal<boolean>(false);
  paymentNotice = signal<string>('');

  private orderHubConnection: signalR.HubConnection | null = null;

  ngOnInit(): void {
    if (!this.cartService.cart() || this.cartService.cart()!.items.length === 0) {
      this.cartService.loadCart().subscribe();
    }
  }

  ngOnDestroy(): void {
    this.stopCountdown();
    this.stopOrderHub();
  }

  getItemPrice(item: any): number {
    return item.productVariant?.finalPrice ?? item.productVariant?.product?.finalPrice ?? item.productVariant?.basePrice ?? item.productVariant?.product?.basePrice ?? 0;
  }

  getItemName(item: any): string {
    return item.productVariant?.product?.name ?? item.productVariant?.productName ?? 'Product';
  }

  getItemImage(item: any): string {
    const images = item.productVariant?.product?.images;
    if (images && images.length > 0) {
      const primary = images.find((i: any) => i.isPrimary);
      return this.getImageUrl(primary ? primary.imageUrl : images[0].imageUrl);
    }
    if (item.productVariant?.productImage) {
      return this.getImageUrl(item.productVariant.productImage);
    }
    return 'https://placehold.co/100x100?text=No+Image';
  }

  getImageUrl(url?: string): string {
    if (!url) return 'https://placehold.co/100x100?text=No+Image';
    if (url.startsWith('http')) return url;
    return `${this.apiUrl}${url}`;
  }

  placeOrder(): void {
    const items = this.cartService.cart()?.items;
    if (!items || items.length === 0) {
      this.errorMessage.set('Your cart is empty.');
      return;
    }

    if (!this.contactPhone().trim() || !this.shippingAddress().trim()) {
      this.errorMessage.set('Please fill out your contact phone and shipping address.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.isPaymentSuccess.set(false);
    this.paymentSuccessData.set(null);
    this.paymentNotice.set('');

    const dto: PlaceOrderDto = {
      contactPhone: this.contactPhone().trim(),
      shippingAddress: this.shippingAddress().trim(),
      deliveryLatitude: this.deliveryLatitude(),
      deliveryLongitude: this.deliveryLongitude(),
      items: items.map((i) => ({
        variantId: i.productVariantId,
        quantity: i.quantity
      }))
    };

    this.orderService.placeOrder(dto).subscribe({
      next: (res: PlaceOrderResponseDto) => {
        this.isSubmitting.set(false);
        const normalized = this.normalizeOrderResponse(res);
        if (normalized && normalized.orderId) {
          this.khqrData.set(normalized);
          
          if (normalized.qrImage) {
            this.qrDataUrl.set(normalized.qrImage);
          } else if (normalized.qrString) {
            this.generateQrCode(normalized.qrString);
          }

          this.startCountdown(normalized.expiration);
          this.showKhqrModal.set(true);

          // Connect to SignalR OrderHub for real-time payment success listener
          this.startOrderHub(normalized.orderId);

          // Refresh cart state
          this.cartService.loadCart().subscribe();
        } else {
          this.errorMessage.set(res.message || 'Failed to place order.');
        }
      },
      error: (err) => {
        console.error('Order Error:', err);
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || 'Error processing order. Please try again.');
      }
    });
  }

  private normalizeOrderResponse(res: PlaceOrderResponseDto): NormalizedOrderQrData | null {
    if (!res) return null;

    const data = res.data;

    const orderId = res.orderId || data?.orderId || '';
    const status = res.status || data?.status || 'Pending';
    const totalAmount = res.totalAmount ?? data?.totalAmount ?? data?.amount ?? 0;
    const qrImage = res.qrImage || data?.qrImage;
    const qrString = res.qrString || data?.qrString || data?.qr_code || '';
    const qrMd5 = res.qrMd5 || data?.qrMd5 || data?.qr_md5 || '';
    const expiration = res.expiration || data?.expiration || data?.qr_expiration || new Date(Date.now() + 15 * 60000).toISOString();
    const merchantName = data?.merchant_name || 'CLH168.';
    const currency = data?.currency || 'USD';

    return {
      orderId,
      status,
      totalAmount,
      qrImage,
      qrString,
      qrMd5,
      expiration,
      merchantName,
      currency
    };
  }

  private generateQrCode(qrString: string): void {
    QRCode.toDataURL(qrString, { width: 300, margin: 2 }, (err, url) => {
      if (err) {
        console.error('QR Generation Error:', err);
      } else {
        this.qrDataUrl.set(url);
      }
    });
  }

  private startCountdown(expirationIso: string): void {
    this.stopCountdown();

    const expirationTime = new Date(expirationIso).getTime();
    
    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = Math.max(0, Math.floor((expirationTime - now) / 1000));
      this.remainingSeconds.set(diff);

      const mins = Math.floor(diff / 60);
      const secs = diff % 60;
      this.timerFormatted.set(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);

      if (diff <= 0) {
        this.stopCountdown();
      }
    };

    updateTimer();
    this.countdownTimer = setInterval(updateTimer, 1000);
  }

  private stopCountdown(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  // SignalR OrderHub Integration
  async startOrderHub(orderId: string): Promise<void> {
    if (typeof window === 'undefined') return;
    await this.stopOrderHub();

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken') || '';
      
      this.orderHubConnection = new signalR.HubConnectionBuilder()
        .withUrl(`${this.apiUrl}/orderHub`, {
          accessTokenFactory: () => token
        })
        .withAutomaticReconnect()
        .build();

      await this.orderHubConnection.start();
      console.log('📡 SignalR OrderHub connected successfully for Order:', orderId);
      
      await this.orderHubConnection.invoke('JoinOrderGroup', orderId);

      this.orderHubConnection.on('ReceivePaymentSuccess', (data: any) => {
        console.log('🎉 Payment Confirmed via SignalR:', data);
        this.handlePaymentConfirmed(data);
      });
    } catch (err) {
      console.error('SignalR OrderHub Connection Error:', err);
    }
  }

  async stopOrderHub(): Promise<void> {
    if (this.orderHubConnection) {
      const currentOrderId = this.khqrData()?.orderId;
      try {
        if (currentOrderId && this.orderHubConnection.state === signalR.HubConnectionState.Connected) {
          await this.orderHubConnection.invoke('LeaveOrderGroup', currentOrderId);
        }
        await this.orderHubConnection.stop();
      } catch (e) {
        console.warn('SignalR cleanup notice:', e);
      }
      this.orderHubConnection = null;
    }
  }

  /**
   * Developer Test Option A: Simulate Payment Success (No real money needed)
   * POST /api/payment/simulate-success/{orderId}
   */
  simulatePaymentSuccess(): void {
    const orderId = this.khqrData()?.orderId;
    if (!orderId) return;

    this.isSimulatingPayment.set(true);
    this.paymentNotice.set('');

    this.paymentService.simulateSuccess(orderId).subscribe({
      next: (res) => {
        this.isSimulatingPayment.set(false);
        if (res.success) {
          this.handlePaymentConfirmed({
            orderId: res.orderId,
            status: 'Paid',
            transactionRef: res.transactionRef,
            message: res.message
          });
        } else {
          this.paymentNotice.set(res.message || 'Simulation failed.');
        }
      },
      error: (err) => {
        console.error('Simulate Payment Error:', err);
        this.isSimulatingPayment.set(false);
        this.paymentNotice.set(err.error?.message || 'Failed to simulate payment.');
      }
    });
  }

  /**
   * Production Option B: NBC Bakong Status Check
   * POST /api/payment/check-status/{orderId}
   */
  checkBakongStatus(): void {
    const orderId = this.khqrData()?.orderId;
    const qrMd5 = this.khqrData()?.qrMd5;
    if (!orderId || !qrMd5) return;

    this.isCheckingStatus.set(true);
    this.paymentNotice.set('');

    this.paymentService.checkStatus(orderId, qrMd5).subscribe({
      next: (res) => {
        this.isCheckingStatus.set(false);
        if (res.success) {
          this.handlePaymentConfirmed({
            orderId: res.orderId || orderId,
            status: 'Paid',
            transactionRef: res.transactionRef || 'BAKONG-CONFIRMED',
            message: res.message
          });
        } else {
          this.paymentNotice.set(res.message || 'Payment not detected yet on Bakong ledger. Please scan and complete payment in your banking app.');
        }
      },
      error: (err) => {
        console.error('Check Status Error:', err);
        this.isCheckingStatus.set(false);
        this.paymentNotice.set(err.error?.message || 'No confirmed transaction found on NBC Bakong network yet.');
      }
    });
  }

  private handlePaymentConfirmed(data: any): void {
    this.isPaymentSuccess.set(true);
    this.paymentSuccessData.set(data);
    this.stopCountdown();
    this.cartService.loadCart().subscribe();
  }

  copyMd5(): void {
    const md5 = this.khqrData()?.qrMd5;
    if (md5 && typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(md5).then(() => {
        this.copiedMd5.set(true);
        setTimeout(() => this.copiedMd5.set(false), 2000);
      });
    }
  }

  finishPayment(): void {
    const orderId = this.khqrData()?.orderId;
    this.stopOrderHub();
    this.showKhqrModal.set(false);
    if (orderId) {
      this.router.navigate(['/orders', orderId]);
    } else {
      this.router.navigate(['/orders']);
    }
  }

  closeModal(): void {
    this.stopOrderHub();
    this.showKhqrModal.set(false);
  }
}
