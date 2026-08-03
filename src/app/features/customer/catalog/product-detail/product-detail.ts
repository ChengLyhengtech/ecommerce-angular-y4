import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';
import { ProductService } from '../../../../core/services/product.service';
import { CartService } from '../../../../core/services/cart.service';
import { ProductVariant, ProductImage } from '../../../../core/models/product.model';
import { AuthService } from '../../../../core/services/auth.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css'
})
export class ProductDetailComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productService = inject(ProductService);
  private authService = inject(AuthService);
  cartService = inject(CartService);

  apiUrl = environment.apiUrl;
  productId = signal<string>('');

  selectedColor = signal<string>('');
  selectedSize = signal<string>('');
  selectedImageIndex = signal<number>(0);
  quantity = signal<number>(1);
  isAddingToCart = signal<boolean>(false);
  addedToastSuccess = signal<boolean>(false);

  constructor() {
    this.route.params.subscribe((params) => {
      if (params['id']) {
        this.productId.set(params['id']);
        this.selectedImageIndex.set(0);
        this.quantity.set(1);
      }
    });

    effect(() => {
      const prod = this.productQuery.data();
      if (prod && prod.variants && prod.variants.length > 0) {
        const available = prod.variants.find((v) => v.availableStock > 0) || prod.variants[0];
        const normColor = this.normalizeColor(available.color);
        if (!this.selectedColor() || !prod.variants.some(v => this.normalizeColor(v.color) === this.selectedColor())) {
          this.selectedColor.set(normColor);
          this.selectedSize.set(available.size || '');
          this.resetImageSelection();
        }
      }
    });
  }

  // TanStack Query for Product Detail
  productQuery = injectQuery(() => {
    const id = this.productId();
    return {
      queryKey: ['productDetail', id],
      queryFn: () => lastValueFrom(this.productService.getProductById(id)),
      enabled: !!id
    };
  });

  product = computed(() => this.productQuery.data());
  variants = computed(() => this.product()?.variants ?? []);
  images = computed(() => this.product()?.images ?? []);

  normalizeColor(color?: string): string {
    if (!color || !color.trim()) return '';
    const c = color.trim().toLowerCase();
    return c.charAt(0).toUpperCase() + c.slice(1);
  }

  availableColors = computed(() => {
    const set = new Set<string>();
    for (const v of this.variants()) {
      if (v.color) {
        set.add(this.normalizeColor(v.color));
      }
    }
    return Array.from(set);
  });

  sizeOptions = computed(() => {
    const selectedColorLower = this.selectedColor().toLowerCase();
    const variants = this.variants();
    const colorVariants = variants.filter(v => this.normalizeColor(v.color).toLowerCase() === selectedColorLower);

    const allSizes = Array.from(new Set(variants.map(v => v.size))).sort((a, b) => {
      const numA = parseFloat(a);
      const numB = parseFloat(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });

    return allSizes.map(size => {
      const matchingVariant = colorVariants.find(v => v.size === size);
      return {
        size,
        availableStock: matchingVariant ? matchingVariant.availableStock : 0,
        existsForColor: !!matchingVariant,
        variant: matchingVariant || null
      };
    });
  });

  selectedVariant = computed(() => {
    const colorLower = this.selectedColor().toLowerCase();
    const size = this.selectedSize();
    if (!colorLower || !size) return null;
    return this.variants().find(v => this.normalizeColor(v.color).toLowerCase() === colorLower && v.size === size) || null;
  });

  filteredImages = computed<ProductImage[]>(() => {
    const allImages = this.images();
    if (!allImages || allImages.length === 0) return [];

    const selectedColorLower = this.selectedColor().toLowerCase();
    if (!selectedColorLower) return allImages;

    // Find all variants that have this selected color
    const colorVariants = this.variants().filter(v => this.normalizeColor(v.color).toLowerCase() === selectedColorLower);
    const variantIds = new Set(colorVariants.map(v => v.id.toLowerCase()));
    const variantSkus = new Set(colorVariants.map(v => (v.sku || '').toLowerCase()));

    // Filter images matching color name, variant ID, or variant SKU
    const matchedImages = allImages.filter(img => {
      const imgColorLower = (img.color || '').toLowerCase();
      const imgVarIdLower = (img.productVariantId || '').toLowerCase();

      // Direct color name match (e.g. "orange")
      if (imgColorLower === selectedColorLower) return true;

      // Color property or productVariantId contains variant ID or SKU for this color
      if (variantIds.has(imgColorLower) || variantIds.has(imgVarIdLower)) return true;
      if (variantSkus.has(imgColorLower) || variantSkus.has(imgVarIdLower)) return true;

      return false;
    });

    return matchedImages.length > 0 ? matchedImages : allImages;
  });

  displayedImage = computed<ProductImage | null>(() => {
    const images = this.filteredImages();
    if (images.length === 0) return null;
    const index = this.selectedImageIndex();
    if (index >= 0 && index < images.length) {
      return images[index];
    }
    return images[0];
  });

  getImageUrl(url?: string): string {
    if (!url) return 'https://placehold.co/600x600?text=Product';
    if (url.startsWith('http')) return url;
    return `${this.apiUrl}${url}`;
  }

  getColorHex(colorName: string): string {
    const c = colorName.trim().toLowerCase();
    const colorMap: Record<string, string> = {
      black: '#0f172a',
      white: '#ffffff',
      red: '#ef4444',
      blue: '#3b82f6',
      green: '#22c55e',
      yellow: '#eab308',
      purple: '#a855f7',
      pink: '#ec4899',
      gray: '#64748b',
      grey: '#64748b',
      orange: '#f97316',
      brown: '#78350f',
      navy: '#1e3a8a',
      beige: '#f5f5dc',
      silver: '#c0c0c0',
      gold: '#ffd700',
      cream: '#fffdd0',
      teal: '#0d9488',
      cyan: '#06b6d4',
      indigo: '#6366f1',
      maroon: '#800000',
      olive: '#808000'
    };
    return colorMap[c] || '#cbd5e1';
  }

  selectColor(color: string): void {
    const norm = this.normalizeColor(color);
    this.selectedColor.set(norm);

    // Check if currently selected size exists with stock for this color
    const colorVariants = this.variants().filter(v => this.normalizeColor(v.color).toLowerCase() === norm.toLowerCase());
    const sizeWithStock = colorVariants.find(v => v.size === this.selectedSize() && v.availableStock > 0);

    if (!sizeWithStock) {
      // Pick first available size with stock for this color
      const availableForColor = colorVariants.find(v => v.availableStock > 0);
      if (availableForColor) {
        this.selectedSize.set(availableForColor.size);
      } else if (colorVariants.length > 0) {
        this.selectedSize.set(colorVariants[0].size);
      }
    }
    this.resetImageSelection();
  }

  selectSize(size: string): void {
    this.selectedSize.set(size);
    this.resetImageSelection();
  }

  resetImageSelection(): void {
    const images = this.filteredImages();
    if (images.length === 0) {
      this.selectedImageIndex.set(0);
      return;
    }
    const primaryIndex = images.findIndex(img => img.isPrimary);
    this.selectedImageIndex.set(primaryIndex >= 0 ? primaryIndex : 0);
  }

  updateQuantity(change: number): void {
    const next = this.quantity() + change;
    const maxStock = this.selectedVariant()?.availableStock ?? 99;
    if (next >= 1 && next <= maxStock) {
      this.quantity.set(next);
    }
  }

  addToCart(): void {
    const variant = this.selectedVariant();
    if (!variant || variant.availableStock <= 0) return;

    this.isAddingToCart.set(true);
    this.cartService.addToCart(variant.id, this.quantity()).subscribe({
      next: () => {
        this.isAddingToCart.set(false);
        this.addedToastSuccess.set(true);
        setTimeout(() => this.addedToastSuccess.set(false), 3000);
        this.cartService.openDrawer();
      },
      error: (err) => {
        console.error(err);
        this.isAddingToCart.set(false);
      }
    });
  }

  buyNow(): void {
    const variant = this.selectedVariant();
    if (!variant || variant.availableStock <= 0) return;

    this.cartService.addToCart(variant.id, this.quantity()).subscribe({
      next: () => {
        if (!this.authService.isLoggedIn()) {
          this.router.navigate(['/login'], { queryParams: { returnUrl: '/checkout' } });
        } else {
          this.router.navigate(['/checkout']);
        }
      }
    });
  }
}
