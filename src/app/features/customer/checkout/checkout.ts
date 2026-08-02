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
import {
  GenerateKhqrRequest,
  GenerateKhqrResponse,
  CheckPaymentStatusResponse,
  PaymentSimulateSuccessResponse,
  KhqrDeeplinkResponse
} from '../../../core/models/payment.model';
import { environment } from '../../../../environments/environment';

export interface NormalizedOrderQrData {
  orderId: string;
  invoice?: string;
  status: string;
  totalAmount: number;
  qrImage?: string;
  qrString?: string;
  qrMd5: string;
  expiration: string;
  merchantName?: string;
  currency?: string;
  shortLink?: string;
  bakongAppDeepLink?: string;
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
  paymentService = inject(PaymentService);
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

  // Expiration & Timer state (Default 30 Minutes for Bakong KHQR)
  isQrExpired = signal<boolean>(false);
  remainingSeconds = signal<number>(0);
  timerFormatted = signal<string>('30:00');
  private countdownTimer: any = null;
  copiedMd5 = signal<boolean>(false);

  // Polling state
  isPolling = signal<boolean>(false);
  isRegenerating = signal<boolean>(false);
  private pollingTimer: any = null;

  // Mobile Deeplink State
  isGeneratingDeeplink = signal<boolean>(false);
  deeplinkData = signal<{ shortLink?: string; bakongAppDeepLink?: string } | null>(null);

  // Payment Confirmation & SignalR State
  isPaymentSuccess = signal<boolean>(false);
  paymentSuccessData = signal<any>(null);
  isSimulatingPayment = signal<boolean>(false);
  isCheckingStatus = signal<boolean>(false);
  paymentNotice = signal<string>('');

  private orderHubConnection: signalR.HubConnection | null = null;

  get khrAmount(): number {
    const usd = this.khqrData()?.totalAmount || 0;
    return Math.round(usd * 4100);
  }

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
    this.stopPolling();
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
          this.isQrExpired.set(false);

          if (normalized.qrImage) {
            this.qrDataUrl.set(normalized.qrImage);
          }
          if (normalized.qrString) {
            this.generateQrCode(normalized.qrString);
          }

          if (!normalized.qrString && !normalized.qrImage) {
            this.fetchKhqrFromBackend(normalized.orderId, normalized.totalAmount, normalized.currency);
          }

          this.startCountdown(normalized.expiration);
          this.startPolling(normalized.invoice, normalized.qrMd5, normalized.orderId);
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

  private fetchKhqrFromBackend(orderId: string, amount: number, currency: string = 'USD'): void {
    const req: GenerateKhqrRequest = { orderId, amount, currency };
    this.paymentService.generateKhqr(req).subscribe({
      next: (res: GenerateKhqrResponse) => {
        if (!res) return;
        const current = this.khqrData();
        const expiration = res.expiration || res.qr_expiration || current?.expiration || new Date(Date.now() + 30 * 60000).toISOString();
        let qrString = res.qrString || res.qr_code || current?.qrString || '';
        let qrMd5 = res.qr_md5 || res.md5 || res.qrMd5 || current?.qrMd5 || '';
        let invoice = res.invoice || current?.invoice;
        let qrImage = (invoice || qrMd5) ? this.paymentService.getQrImageUrl(invoice || qrMd5) : current?.qrImage;

        const validated = this.ensureValidKhqr(
          qrString,
          orderId,
          amount,
          currency,
          res.merchant_name || current?.merchantName || 'ChengLyheng',
          expiration
        );

        qrString = validated.qrString;
        qrMd5 = validated.qrMd5 || qrMd5;

        const updated: NormalizedOrderQrData = {
          orderId,
          invoice,
          status: 'Pending',
          totalAmount: res.amount || amount,
          qrImage,
          qrString,
          qrMd5,
          expiration,
          merchantName: res.merchant_name || current?.merchantName,
          currency: res.currency || currency
        };

        this.khqrData.set(updated);
        if (updated.qrImage) {
          this.qrDataUrl.set(updated.qrImage);
        }
        if (qrString) {
          this.generateQrCode(qrString);
        }
        this.startPolling(invoice, qrMd5, orderId);
      },
      error: (err) => {
        console.warn('Could not fetch KHQR directly from backend generate endpoint:', err);
      }
    });
  }

  private normalizeOrderResponse(res: PlaceOrderResponseDto): NormalizedOrderQrData | null {
    if (!res) return null;

    const data = res.data;

    const orderId = res.orderId || data?.orderId || '';
    const status = res.status || data?.status || 'Pending';
    const totalAmount = res.totalAmount ?? data?.totalAmount ?? data?.amount ?? 0;

    let qrString = res.qrString || data?.qrString || data?.qr_code || '';
    let qrMd5 = res.qrMd5 || data?.qrMd5 || data?.qr_md5 || '';
    const expiration = res.expiration || data?.expiration || data?.qr_expiration || new Date(Date.now() + 30 * 60000).toISOString();
    const merchantName = data?.merchant_name || 'ChengLyheng';
    const currency = data?.currency || 'USD';

    let invoice = res.invoice || data?.invoice;
    if (!invoice && qrString) {
      const match = qrString.match(/(INV-[A-Za-z0-9]+)/i);
      if (match) {
        invoice = match[1];
      }
    }
    if (!invoice) {
      invoice = orderId ? `INV-${orderId.substring(0, 8)}` : '';
    }

    // Image URL using /api/qr-image/{invoice}
    let qrImage = res.qrImage || data?.qrImage || (invoice || qrMd5 ? this.paymentService.getQrImageUrl(invoice || qrMd5) : undefined);

    // Verify and ensure valid NBC Bakong KHQR payload string
    const validated = this.ensureValidKhqr(qrString, orderId, totalAmount, currency, merchantName, expiration);
    qrString = validated.qrString;
    qrMd5 = validated.qrMd5 || qrMd5;

    return {
      orderId,
      invoice,
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

  private ensureValidKhqr(
    qrString: string,
    orderId: string,
    amount: number,
    currency: string,
    merchantName: string,
    expirationIso: string
  ): { qrString: string; qrMd5: string } {
    try {
      // Dynamic require avoids TypeScript type-only stripping issues from @types/bakong-khqr
      const BakongSDK: any = typeof window !== 'undefined' ? (window as any).BakongKHQR || require('bakong-khqr') : require('bakong-khqr');

      if (qrString && BakongSDK?.BakongKHQR) {
        const verifyResult = BakongSDK.BakongKHQR.verify(qrString);
        if (verifyResult && verifyResult.isValid) {
          return { qrString, qrMd5: '' };
        }
      }
    } catch (e) {
      console.warn('KHQR Verification check notice:', e);
    }

    // If string is invalid or missing required EMVCo tags (e.g. tag 99 timestamp for dynamic QR), generate compliant KHQR
    try {
      const BakongSDK: any = typeof window !== 'undefined' ? (window as any).BakongKHQR || require('bakong-khqr') : require('bakong-khqr');
      if (!BakongSDK) return { qrString: qrString || '', qrMd5: '' };

      let bakongAccountId = 'vann_sak@bkrt';
      let city = 'PHNOM PENH';
      let name = merchantName || 'ChengLyheng';

      if (qrString && BakongSDK.BakongKHQR) {
        try {
          const decoded = BakongSDK.BakongKHQR.decode(qrString);
          const decodedData = decoded?.data;
          if (decodedData?.bakongAccountID) {
            bakongAccountId = decodedData.bakongAccountID;
          }
          if (decodedData?.merchantName) {
            name = decodedData.merchantName;
          }
          if (decodedData?.merchantCity) {
            city = decodedData.merchantCity;
          }
        } catch (e) { }
      }

      let expTime = new Date(expirationIso).getTime();
      if (isNaN(expTime) || expTime <= Date.now()) {
        expTime = Date.now() + 30 * 60 * 1000;
      }

      const cleanBillNo = (orderId || '').replace(/-/g, '').substring(0, 25);
      const curr = (currency || 'USD').toUpperCase() === 'KHR'
        ? BakongSDK.khqrData?.currency?.khr || '116'
        : BakongSDK.khqrData?.currency?.usd || '840';

      const indInfo = new BakongSDK.IndividualInfo(
        bakongAccountId,
        name,
        city,
        {
          currency: curr,
          amount: amount > 0 ? amount : undefined,
          billNumber: cleanBillNo || undefined,
          storeLabel: name,
          terminalLabel: 'POS1',
          expirationTimestamp: expTime
        }
      );

      const bakong = new BakongSDK.BakongKHQR();
      const res = bakong.generateIndividual(indInfo);
      if (res && res.data && res.data.qr) {
        console.log('✅ Generated valid NBC Bakong KHQR:', res.data.qr);
        return { qrString: res.data.qr, qrMd5: res.data.md5 };
      }
    } catch (err) {
      console.error('Failed to generate fallback KHQR:', err);
    }

    return { qrString: qrString || '', qrMd5: '' };
  }

  private generateQrCode(qrString: string): void {
    if (!qrString) return;
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
    this.isQrExpired.set(false);

    let expirationTime = new Date(expirationIso).getTime();
    if (isNaN(expirationTime) || expirationTime <= Date.now()) {
      expirationTime = Date.now() + 30 * 60 * 1000;
    }

    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = Math.max(0, Math.floor((expirationTime - now) / 1000));
      this.remainingSeconds.set(diff);

      const mins = Math.floor(diff / 60);
      const secs = diff % 60;
      this.timerFormatted.set(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);

      if (diff <= 0) {
        this.isQrExpired.set(true);
        this.timerFormatted.set('00:00');
        this.paymentNotice.set('This KHQR code has expired. Please click "Regenerate KHQR Code" to refresh payment instructions.');
        this.stopCountdown();
        this.stopPolling();
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

  // --- 3-5 SECOND BACKUP POLLING MECHANISM ---
  private startPolling(invoice?: string, qrMd5?: string, orderId?: string): void {
    this.stopPolling();
    const targetIdentifier = invoice || qrMd5 || orderId;
    if (!targetIdentifier) return;

    this.isPolling.set(true);

    this.pollingTimer = setInterval(() => {
      if (!this.showKhqrModal() || this.isQrExpired() || this.isPaymentSuccess()) {
        this.stopPolling();
        return;
      }

      this.paymentService.checkPaymentStatus(targetIdentifier).subscribe({
        next: (res: CheckPaymentStatusResponse) => {
          const isPaid = res && (
            res.paid === true ||
            res.status === 'PAID' ||
            res.status === 'Paid' ||
            res.success === true
          );

          if (isPaid) {
            this.handlePaymentConfirmed({
              orderId: res.orderId || res.order_id || orderId,
              invoice: res.invoice || invoice,
              status: 'PAID',
              amount: res.amount,
              currency: res.currency,
              paidAt: res.paid_at,
              transactionRef: res.transactionRef || res.invoice || 'KHQR-VERIFIED-SUCCESS',
              message: res.message || 'Payment successfully verified!'
            });
          }
        },
        error: (err) => {
          console.warn('Polling status check notice:', err);
        }
      });
    }, 3000);
  }

  private stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
    this.isPolling.set(false);
  }

  // Regenerate KHQR when QR code expires
  regenerateKhqr(): void {
    const currentData = this.khqrData();
    if (!currentData) return;

    this.isRegenerating.set(true);
    this.paymentNotice.set('');

    const req: GenerateKhqrRequest = {
      orderId: currentData.orderId,
      amount: currentData.totalAmount,
      currency: currentData.currency || 'USD'
    };

    this.paymentService.generateKhqr(req).subscribe({
      next: (res: GenerateKhqrResponse) => {
        this.isRegenerating.set(false);
        const freshExpiration = res?.expiration || res?.qr_expiration || new Date(Date.now() + 30 * 60000).toISOString();
        let freshQrString = res?.qrString || res?.qr_code || currentData.qrString || '';
        let freshMd5 = res?.qr_md5 || res?.md5 || res?.qrMd5 || currentData.qrMd5 || '';
        let freshInvoice = res?.invoice || currentData.invoice;

        const validated = this.ensureValidKhqr(
          freshQrString,
          currentData.orderId,
          currentData.totalAmount,
          currentData.currency || 'USD',
          res?.merchant_name || currentData.merchantName || 'ChengLyheng',
          freshExpiration
        );

        freshQrString = validated.qrString;
        freshMd5 = validated.qrMd5 || freshMd5;

        const qrImageUrl = (freshInvoice || freshMd5)
          ? this.paymentService.getQrImageUrl(freshInvoice || freshMd5)
          : undefined;

        const updatedData: NormalizedOrderQrData = {
          ...currentData,
          invoice: freshInvoice,
          qrString: freshQrString,
          qrMd5: freshMd5,
          qrImage: qrImageUrl || currentData.qrImage,
          expiration: freshExpiration
        };

        this.khqrData.set(updatedData);
        this.isQrExpired.set(false);

        if (updatedData.qrImage) {
          this.qrDataUrl.set(updatedData.qrImage);
        }
        if (freshQrString) {
          this.generateQrCode(freshQrString);
        }

        this.startCountdown(freshExpiration);
        this.startPolling(freshInvoice, freshMd5, updatedData.orderId);
        this.startOrderHub(updatedData.orderId);
      },
      error: () => {
        this.isRegenerating.set(false);
        // Fallback: Extend timer locally for 30 mins
        const extendedExpiration = new Date(Date.now() + 30 * 60000).toISOString();
        this.khqrData.update((prev) => prev ? { ...prev, expiration: extendedExpiration } : null);
        this.isQrExpired.set(false);
        this.startCountdown(extendedExpiration);
        this.startPolling(currentData.invoice, currentData.qrMd5, currentData.orderId);
      }
    });
  }

  // Generate DeepLink for Bakong / Mobile Banking Redirects
  generateDeeplink(): void {
    const qrString = this.khqrData()?.qrString;
    if (!qrString) return;

    this.isGeneratingDeeplink.set(true);
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4200';

    this.paymentService.generateDeeplink({
      qrString,
      sourceInfo: {
        appIconUrl: `${origin}/assets/logo.png`,
        appName: 'CLH168 Store',
        appDeepLinkCallback: `${origin}/orders`
      }
    }).subscribe({
      next: (res: KhqrDeeplinkResponse) => {
        this.isGeneratingDeeplink.set(false);
        if (res && res.data) {
          this.deeplinkData.set(res.data);
          const redirectUrl = res.data.bakongAppDeepLink || res.data.shortLink;
          if (redirectUrl && typeof window !== 'undefined') {
            window.location.href = redirectUrl;
          }
        }
      },
      error: (err) => {
        console.warn('Deeplink generation warning:', err);
        this.isGeneratingDeeplink.set(false);
      }
    });
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

      // Join both order_{orderId} and raw orderId to ensure compatibility across backend specs
      await this.orderHubConnection.invoke('JoinOrderGroup', `order_${orderId}`);
      try {
        await this.orderHubConnection.invoke('JoinOrderGroup', orderId);
      } catch (e) { }

      this.orderHubConnection.on('ReceivePaymentSuccess', (data: any) => {
        console.log('🎉 Instant Payment Confirmed via SignalR!', data);
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
          await this.orderHubConnection.invoke('LeaveOrderGroup', `order_${currentOrderId}`);
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
      next: (res: PaymentSimulateSuccessResponse) => {
        this.isSimulatingPayment.set(false);
        if (res && (res.success === true || res.paid === true || res.status === 'Paid' || res.status === 'PAID')) {
          this.handlePaymentConfirmed({
            orderId: res.orderId || res.order_id || orderId,
            status: res.status || 'PAID',
            transactionRef: res.transactionRef || 'SIMULATED-SUCCESS',
            message: res.message || 'Simulated payment success executed.'
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
    const data = this.khqrData();
    const targetIdentifier = data?.invoice || data?.qrMd5 || data?.orderId;
    if (!targetIdentifier) return;

    this.isCheckingStatus.set(true);
    this.paymentNotice.set('');

    this.paymentService.checkPaymentStatus(targetIdentifier).subscribe({
      next: (res: CheckPaymentStatusResponse) => {
        this.isCheckingStatus.set(false);
        const isPaid = res && (
          res.paid === true ||
          res.status === 'PAID' ||
          res.status === 'Paid' ||
          res.success === true
        );

        if (isPaid) {
          this.handlePaymentConfirmed({
            orderId: res.orderId || res.order_id || data?.orderId,
            invoice: res.invoice || data?.invoice,
            status: 'PAID',
            amount: res.amount || data?.totalAmount,
            currency: res.currency || data?.currency,
            paidAt: res.paid_at,
            transactionRef: res.transactionRef || res.invoice || 'BAKONG-CONFIRMED',
            message: res.message || 'Payment confirmed on NBC Bakong network.'
          });
        } else {
          this.paymentNotice.set(res.message || 'Payment status is PENDING. Please scan and complete payment in your banking app.');
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
    this.stopPolling();
    this.cartService.clearCartLocal();
    this.cartService.loadCart().subscribe();
  }

  copyMd5(): void {
    const md5 = this.khqrData()?.qrMd5 || this.khqrData()?.invoice;
    if (md5 && typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(md5).then(() => {
        this.copiedMd5.set(true);
        setTimeout(() => this.copiedMd5.set(false), 2000);
      });
    }
  }

  finishPayment(): void {
    const orderId = this.khqrData()?.orderId;
    this.stopPolling();
    this.stopOrderHub();
    this.showKhqrModal.set(false);
    if (orderId) {
      this.router.navigate(['/orders', orderId]);
    } else {
      this.router.navigate(['/orders']);
    }
  }

  closeModal(): void {
    this.stopCountdown();
    this.stopPolling();
    this.stopOrderHub();
    this.showKhqrModal.set(false);
  }
}
