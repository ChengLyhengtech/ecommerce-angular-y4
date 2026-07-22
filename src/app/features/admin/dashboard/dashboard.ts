import { Component, inject, signal, effect, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { injectQuery, injectMutation, injectQueryClient } from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';
import { DashboardService } from '../../../core/services/dashboard.service';
import { InventoryService } from '../../../core/services/inventory.service';
import { GeospatialLogistic } from '../../../core/models/dashboard.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent implements OnDestroy {
  private dashboardService = inject(DashboardService);
  private inventoryService = inject(InventoryService);
  private queryClient = injectQueryClient();

  // Date Filters
  startDate = signal<string>('');
  endDate = signal<string>('');

  // Restock overlay state
  activeRestockAlertId = signal<string | null>(null);
  restockQuantity = signal<number>(50);
  restockReason = signal<string>('Low Stock Alert Replenish');

  // Map variables
  private map: any;
  private markers: any[] = [];

  // Query summary
  dashboardQuery = injectQuery(() => {
    const start = this.startDate();
    const end = this.endDate();
    return {
      queryKey: ['dashboardSummary', { start, end }],
      queryFn: () => lastValueFrom(this.dashboardService.getSummary(start || undefined, end || undefined))
    };
  });

  // Restock mutation
  restockMutation = injectMutation(() => ({
    mutationFn: (data: { variantId: string; quantity: number; reasonCode: string }) =>
      lastValueFrom(this.inventoryService.restock(data)),
    onSuccess: () => {
      this.queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      this.activeRestockAlertId.set(null);
      this.restockQuantity.set(50);
      this.restockReason.set('Low Stock Alert Replenish');
      alert('Alerted Variant successfully restocked!');
    },
    onError: (err) => {
      console.error('Failed to restock from dashboard alert:', err);
      alert('Failed to restock. Please check values and try again.');
    }
  }));

  constructor() {
    // Re-render/Update leaflet map markers whenever the query finishes loading new data
    effect(() => {
      const data = this.dashboardQuery.data();
      if (data && data.geospatialLogistics) {
        setTimeout(() => {
          this.initOrUpdateMap(data.geospatialLogistics);
        }, 150);
      }
    });
  }

  onFilterChange(): void {
    // Signals update will automatically trigger refetch through TanStack query binding
  }

  clearFilters(): void {
    this.startDate.set('');
    this.endDate.set('');
  }

  // Quick Restock Action triggers
  openRestockAlertModal(variantId: string): void {
    this.activeRestockAlertId.set(variantId);
  }

  closeRestockModal(): void {
    this.activeRestockAlertId.set(null);
  }

  submitRestock(): void {
    const variantId = this.activeRestockAlertId();
    const qty = this.restockQuantity();
    const reason = this.restockReason();
    if (variantId && qty > 0 && reason) {
      this.restockMutation.mutate({ variantId, quantity: qty, reasonCode: reason });
    }
  }

  // Leaflet Dynamic Loader and Controller
  private loadLeaflet(): Promise<void> {
    if ((window as any).L) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      // Load Leaflet CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.id = 'leaflet-css';
      document.head.appendChild(link);

      // Load Leaflet JS
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.id = 'leaflet-js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Leaflet library failed to load'));
      document.body.appendChild(script);
    });
  }

  private async initOrUpdateMap(logistics: GeospatialLogistic[]) {
    try {
      await this.loadLeaflet();
      const L = (window as any).L;
      if (!L) return;

      const container = document.getElementById('delivery-map');
      if (!container) return;

      if (!this.map) {
        // Center of Cambodia coordinates as a solid default fallback
        let center: [number, number] = [11.5564, 104.9282];
        if (logistics && logistics.length > 0) {
          const validCoords = logistics.filter(l => l.deliveryLatitude && l.deliveryLongitude);
          if (validCoords.length > 0) {
            const avgLat = validCoords.reduce((sum, curr) => sum + curr.deliveryLatitude, 0) / validCoords.length;
            const avgLng = validCoords.reduce((sum, curr) => sum + curr.deliveryLongitude, 0) / validCoords.length;
            center = [avgLat, avgLng];
          }
        }

        this.map = L.map('delivery-map').setView(center, 12);

        // CartoDB Dark Matter tile layer for an beautiful administrative dark theme map
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 20
        }).addTo(this.map);
      }

      // Clear existing marker overlays
      this.markers.forEach(m => m.remove());
      this.markers = [];

      if (logistics && logistics.length > 0) {
        const bounds = L.latLngBounds([]);
        let markerCount = 0;

        logistics.forEach(loc => {
          if (loc.deliveryLatitude && loc.deliveryLongitude) {
            // Customize popup with order numbers and financial transaction sizes
            const popupContent = `
              <div style="font-family: 'Inter', sans-serif; color: #1e293b; padding: 4px; line-height: 1.4;">
                <h4 style="margin: 0 0 4px 0; font-size: 13px; font-weight: 700; color: #4f46e5;">Delivery Active</h4>
                <div style="font-size: 11px; margin-bottom: 2px;"><b>Order ID:</b> <span style="font-family: monospace;">${loc.orderId.substring(0, 8)}...</span></div>
                <div style="font-size: 11px; font-weight: 600; color: #0f172a;"><b>Total Amount:</b> $${loc.totalAmount.toFixed(2)}</div>
              </div>
            `;
            const marker = L.marker([loc.deliveryLatitude, loc.deliveryLongitude])
              .addTo(this.map)
              .bindPopup(popupContent);

            this.markers.push(marker);
            bounds.extend([loc.deliveryLatitude, loc.deliveryLongitude]);
            markerCount++;
          }
        });

        // Zoom map to cover all active deliveries
        if (markerCount > 0) {
          this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
        }
      }
    } catch (err) {
      console.error('Failed to update Leaflet Map:', err);
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }
}
