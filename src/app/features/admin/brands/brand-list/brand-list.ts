import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { injectQuery, injectMutation, injectQueryClient } from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';
import { BrandService } from '../../../../core/services/brand.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-brand-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './brand-list.html',
  styleUrl: './brand-list.css',
})
export class BrandListComponent {
  private brandService = inject(BrandService);
  public apiUrl = environment.apiUrl;
  private queryClient = injectQueryClient();

  error = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // TanStack Query for Brands
  brandsQuery = injectQuery(() => ({
    queryKey: ['brands'],
    queryFn: () => lastValueFrom(this.brandService.getBrands())
  }));

  // Delete Mutation
  deleteMutation = injectMutation(() => ({
    mutationFn: (id: string) => lastValueFrom(this.brandService.deleteBrand(id)),
    onSuccess: () => {
      this.successMessage.set('Brand deleted successfully.');
      setTimeout(() => this.successMessage.set(null), 4000);
      this.queryClient.invalidateQueries({ queryKey: ['brands'] });
    },
    onError: (err: any) => {
      console.error('BrandListComponent - Failed to delete brand:', err);
      if (err.status === 400 && err.error) {
        this.error.set(err.error);
      } else {
        this.error.set('Failed to delete brand. Please try again.');
      }
      setTimeout(() => this.error.set(null), 6000);
    }
  }));

  deleteBrand(id: string): void {
    if (confirm('Are you sure you want to delete this brand? This action cannot be undone.')) {
      this.deleteMutation.mutate(id);
    }
  }
}
