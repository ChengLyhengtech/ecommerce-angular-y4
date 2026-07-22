import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import QRCode from 'qrcode';
import { CartService } from '../../../core/services/cart.service';
import { OrderService } from '../../../core/services/order.service';
import { PlaceOrderDto, PlaceOrderResponseData } from '../../../core/models/order.model';
import { environment } from '../../../../environments/environment';

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
  private router = inject(Router);

  apiUrl = environment.apiUrl;

  // Form Fields
  contactPhone = signal<string>('012345678');
  shippingAddress = signal<string>('Street 2004, Phnom Penh');
  deliveryLatitude = signal<number>(11.5564);
  deliveryLongitude = signal<number>(104.9282);

  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string>('');

  // Bakong KHQR Modal state
  showKhqrModal = signal<boolean>(false);
  khqrData = signal<PlaceOrderResponseData | null>(null);
  qrDataUrl = signal<string>('');
  
  // Timer state
  remainingSeconds = signal<number>(0);
  timerFormatted = signal<string>('15:00');
  private countdownTimer: any;
  copiedMd5 = signal<boolean>(false);

  ngOnInit(): void {
    if (!this.cartService.cart() || this.cartService.cart()!.items.length === 0) {
      this.cartService.loadCart().subscribe();
    }
  }

  ngOnDestroy(): void {
    this.stopCountdown();
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
      next: (res) => {
        this.isSubmitting.set(false);
        if (res.success && res.data) {
          this.khqrData.set(res.data);
          this.generateQrCode(res.data.qr_code);
          this.startCountdown(res.data.qr_expiration);
          this.showKhqrModal.set(true);
          // Reload cart so cart badge clears
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

  copyMd5(): void {
    const md5 = this.khqrData()?.qr_md5;
    if (md5 && typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(md5).then(() => {
        this.copiedMd5.set(true);
        setTimeout(() => this.copiedMd5.set(false), 2000);
      });
    }
  }

  finishPayment(): void {
    const orderId = this.khqrData()?.orderId;
    this.showKhqrModal.set(false);
    if (orderId) {
      this.router.navigate(['/orders', orderId]);
    } else {
      this.router.navigate(['/orders']);
    }
  }
}
