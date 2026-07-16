import { Component, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { injectQuery, injectMutation, injectQueryClient } from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';
import { ProductService } from '../../../core/services/product.service';
import { CategoryService } from '../../../core/services/category.service';
import { InventoryService } from '../../../core/services/inventory.service';
import { Product, ProductVariant } from '../../../core/models/product.model';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inventory.html',
  styleUrl: './inventory.css'
})
export class InventoryComponent {
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private inventoryService = inject(InventoryService);
  private queryClient = injectQueryClient();
  public apiUrl = environment.apiUrl;

  // Filters and Pagination
  searchQuery = signal<string>('');
  selectedCategoryId = signal<string>('');
  pageNumber = signal<number>(1);
  pageSize = signal<number>(10);

  // Selected state for active adjustments
  selectedVariant = signal<ProductVariant | null>(null);
  selectedProductName = signal<string>('');
  activeAction = signal<'restock' | 'discard' | 'return' | 'correct' | null>(null);
  adjustmentQuantity = signal<number>(5);
  correctionQuantity = signal<number>(0);

  // Dropdown states
  activeDropdownVariantId = signal<string | null>(null);

  toggleDropdown(variantId: string, event: Event): void {
    event.stopPropagation();
    if (this.activeDropdownVariantId() === variantId) {
      this.activeDropdownVariantId.set(null);
    } else {
      this.activeDropdownVariantId.set(variantId);
    }
  }

  closeDropdowns(): void {
    this.activeDropdownVariantId.set(null);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeDropdowns();
  }

  // TanStack Query for Categories
  categoriesQuery = injectQuery(() => ({
    queryKey: ['categories'],
    queryFn: () => lastValueFrom(this.categoryService.getCategories())
  }));

  // TanStack Query for Products Catalog
  productsQuery = injectQuery(() => {
    const search = this.searchQuery();
    const categoryId = this.selectedCategoryId();
    const pageNumber = this.pageNumber();
    const pageSize = this.pageSize();

    return {
      queryKey: ['products-inventory', { search, categoryId, pageNumber, pageSize }],
      queryFn: () => lastValueFrom(this.productService.getProducts({
        search: search || undefined,
        categoryId: categoryId || undefined,
        pageNumber,
        pageSize
      }))
    };
  });

  // Stock mutation handlers
  restockMutation = injectMutation(() => ({
    mutationFn: (data: { variantId: string; quantity: number }) => 
      lastValueFrom(this.inventoryService.restock(data)),
    onSuccess: () => this.handleMutationSuccess('Variant restocked successfully!'),
    onError: (err) => this.handleMutationError('Failed to restock variant.', err)
  }));

  discardMutation = injectMutation(() => ({
    mutationFn: (data: { variantId: string; quantity: number }) => 
      lastValueFrom(this.inventoryService.discard(data)),
    onSuccess: () => this.handleMutationSuccess('Discard log updated successfully!'),
    onError: (err) => this.handleMutationError('Failed to discard variant.', err)
  }));

  returnMutation = injectMutation(() => ({
    mutationFn: (data: { variantId: string; quantity: number }) => 
      lastValueFrom(this.inventoryService.returnStock(data)),
    onSuccess: () => this.handleMutationSuccess('Stock returned successfully!'),
    onError: (err) => this.handleMutationError('Failed to return stock.', err)
  }));

  correctMutation = injectMutation(() => ({
    mutationFn: (data: { variantId: string; newPhysicalQuantity: number }) => 
      lastValueFrom(this.inventoryService.correct(data)),
    onSuccess: () => this.handleMutationSuccess('Audit correction saved!'),
    onError: (err) => this.handleMutationError('Failed to correct physical stock level.', err)
  }));

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    this.pageNumber.set(1);
  }

  onCategoryChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedCategoryId.set(value);
    this.pageNumber.set(1);
  }

  nextPage(): void {
    const data = this.productsQuery.data();
    if (data && this.pageNumber() < data.totalPages) {
      this.pageNumber.update(n => n + 1);
    }
  }

  prevPage(): void {
    if (this.pageNumber() > 1) {
      this.pageNumber.update(n => n - 1);
    }
  }

  openAdjustment(productName: string, variant: ProductVariant, action: 'restock' | 'discard' | 'return' | 'correct'): void {
    this.closeDropdowns();
    this.selectedVariant.set(variant);
    this.selectedProductName.set(productName);
    this.activeAction.set(action);
    
    // Set default initial quantities
    this.adjustmentQuantity.set(5);
    // Correct type casting check for physical quantities:
    const physicalQty = (variant as any).physicalQuantity !== undefined 
      ? (variant as any).physicalQuantity 
      : variant.availableStock;
    this.correctionQuantity.set(physicalQty);
  }

  closeAdjustment(): void {
    this.selectedVariant.set(null);
    this.selectedProductName.set('');
    this.activeAction.set(null);
  }

  submitAdjustment(): void {
    const variant = this.selectedVariant();
    const action = this.activeAction();
    if (!variant || !action) return;

    if (action === 'restock') {
      this.restockMutation.mutate({ variantId: variant.id, quantity: this.adjustmentQuantity() });
    } else if (action === 'discard') {
      this.discardMutation.mutate({ variantId: variant.id, quantity: this.adjustmentQuantity() });
    } else if (action === 'return') {
      this.returnMutation.mutate({ variantId: variant.id, quantity: this.adjustmentQuantity() });
    } else if (action === 'correct') {
      this.correctMutation.mutate({ variantId: variant.id, newPhysicalQuantity: this.correctionQuantity() });
    }
  }

  private handleMutationSuccess(msg: string): void {
    this.queryClient.invalidateQueries({ queryKey: ['products-inventory'] });
    this.queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    alert(msg);
    this.closeAdjustment();
  }

  private handleMutationError(msg: string, err: any): void {
    console.error(msg, err);
    alert(`${msg} Please try again.`);
  }

  getPrimaryImageUrl(product: Product): string | null {
    if (!product.images || product.images.length === 0) {
      return null;
    }
    const primaryImg = product.images.find(img => img.isPrimary);
    return primaryImg ? primaryImg.imageUrl : product.images[0].imageUrl;
  }

  getAvailableStockStatus(availableStock: number): string {
    if (availableStock <= 0) return 'Out of Stock';
    if (availableStock <= 5) return 'Low Stock';
    return 'In Stock';
  }
}
