import { Component, OnInit, OnDestroy, AfterViewInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import QRCode from 'qrcode';
import * as signalR from '@microsoft/signalr';
import * as L from 'leaflet';
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
  imports: [CommonModule, FormsModule],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css'
})
export class CheckoutComponent implements OnInit, AfterViewInit, OnDestroy {
  cartService = inject(CartService);
  private orderService = inject(OrderService);
  private paymentService = inject(PaymentService);
  private http = inject(HttpClient);
  private router = inject(Router);

  apiUrl = environment.apiUrl;

  // Form Fields
  contactPhone = signal<string>('');
  shippingAddress = signal<string>('');
  deliveryLatitude = signal<number>(11.5564);
  deliveryLongitude = signal<number>(104.9282);

  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string>('');

  // Map & Geolocation Signals
  isLocating = signal<boolean>(false);
  isGeocoding = signal<boolean>(false);
  suggestedAddress = signal<string>('');

  private map: L.Map | null = null;
  private marker: L.Marker | null = null;

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

  ngAfterViewInit(): void {
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        this.initMap();
      }, 100);
    }
  }

  ngOnDestroy(): void {
    this.stopCountdown();
    this.stopOrderHub();
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  // --- LEAFLET MAP & LOCATION PICKER ---
  private initMap(): void {
    const mapElement = document.getElementById('checkoutMap');
    if (!mapElement) return;

    const initialLat = this.deliveryLatitude();
    const initialLng = this.deliveryLongitude();

    // Create Map
    this.map = L.map('checkoutMap', {
      zoomControl: true,
      scrollWheelZoom: true
    }).setView([initialLat, initialLng], 14);

    // OpenStreetMap Tile Layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    // Custom modern red marker pin
    const customMarkerIcon = L.divIcon({
      className: 'custom-map-marker-pin',
      html: `
        <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 36px; height: 36px; background: rgba(220, 38, 38, 0.25); border-radius: 50%; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 30px; height: 30px; background: #dc2626; border: 3px solid #ffffff; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
            <div style="width: 10px; height: 10px; background: #ffffff; border-radius: 50%; transform: rotate(45deg);"></div>
          </div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 36]
    });

    // Add Draggable Marker
    this.marker = L.marker([initialLat, initialLng], {
      draggable: true,
      icon: customMarkerIcon
    }).addTo(this.map);

    // Marker Drag Event
    this.marker.on('dragend', () => {
      if (this.marker) {
        const pos = this.marker.getLatLng();
        this.updateLocation(pos.lat, pos.lng, false);
      }
    });

    // Map Click Event
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.updateLocation(e.latlng.lat, e.latlng.lng, false);
    });

    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
      }
    }, 300);

    // Run initial reverse geocode for default position if address is empty
    this.reverseGeocode(initialLat, initialLng);
  }

  updateLocation(lat: number, lng: number, flyTo: boolean = false): void {
    const formattedLat = +lat.toFixed(6);
    const formattedLng = +lng.toFixed(6);

    this.deliveryLatitude.set(formattedLat);
    this.deliveryLongitude.set(formattedLng);

    if (this.marker) {
      this.marker.setLatLng([lat, lng]);
    }

    if (this.map && flyTo) {
      this.map.flyTo([lat, lng], 16, { animate: true, duration: 1.2 });
    }

    this.reverseGeocode(formattedLat, formattedLng);
  }

  detectCurrentLocation(): void {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    this.isLocating.set(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.isLocating.set(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        this.updateLocation(lat, lng, true);
      },
      (err) => {
        this.isLocating.set(false);
        console.warn('Geolocation permission error:', err);
        alert('Could not access your location. Please select a point directly on the map.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  reverseGeocode(lat: number, lng: number): void {
    this.isGeocoding.set(true);
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;

    this.http.get<any>(url).subscribe({
      next: (res) => {
        this.isGeocoding.set(false);
        if (res && res.display_name) {
          this.suggestedAddress.set(res.display_name);
          // If shipping address is currently empty, pre-fill it automatically!
          if (!this.shippingAddress().trim()) {
            this.shippingAddress.set(res.display_name);
          }
        }
      },
      error: (err) => {
        this.isGeocoding.set(false);
        console.warn('Reverse geocoding error:', err);
      }
    });
  }

  applySuggestedAddress(): void {
    if (this.suggestedAddress()) {
      this.shippingAddress.set(this.suggestedAddress());
    }
  }

  // --- CHECKOUT & ORDER LOGIC ---
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
