import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { injectQuery, injectMutation, injectQueryClient } from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';
import { ProductService } from '../../../../core/services/product.service';
import { CategoryService } from '../../../../core/services/category.service';
import { Product } from '../../../../core/models/product.model';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './product-list.html',
  styleUrl: './product-list.css',
})
export class ProductListComponent {
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private router = inject(Router);
  public apiUrl = environment.apiUrl;
  private queryClient = injectQueryClient();

  // Filters and Pagination
  searchQuery = signal<string>('');
  selectedCategoryId = signal<string>('');
  pageNumber = signal<number>(1);
  pageSize = signal<number>(10);

  // TanStack Query for Categories
  categoriesQuery = injectQuery(() => ({
    queryKey: ['categories'],
    queryFn: () => lastValueFrom(this.categoryService.getCategories())
  }));

  // TanStack Query for Products
  productsQuery = injectQuery(() => {
    const search = this.searchQuery();
    const categoryId = this.selectedCategoryId();
    const pageNumber = this.pageNumber();
    const pageSize = this.pageSize();

    return {
      queryKey: ['products', { search, categoryId, pageNumber, pageSize }],
      queryFn: () => lastValueFrom(this.productService.getProducts({
        search: search || undefined,
        categoryId: categoryId || undefined,
        pageNumber,
        pageSize
      }))
    };
  });

  // Delete Mutation
  deleteMutation = injectMutation(() => ({
    mutationFn: (id: string) => lastValueFrom(this.productService.deleteProduct(id)),
    onSuccess: () => {
      this.queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err) => {
      console.error('ProductListComponent - Failed to delete product:', err);
    }
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

  onDeleteProduct(id: string): void {
    if (confirm('Are you sure you want to delete this product?')) {
      this.deleteMutation.mutate(id);
    }
  }

  onRowClick(productId: string): void {
    this.router.navigate(['/admin/products/edit', productId]);
  }

  getPrimaryImageUrl(product: Product): string | null {
    if (!product.images || product.images.length === 0) {
      return null;
    }
    const primaryImg = product.images.find(img => img.isPrimary);
    return primaryImg ? primaryImg.imageUrl : product.images[0].imageUrl;
  }
}
