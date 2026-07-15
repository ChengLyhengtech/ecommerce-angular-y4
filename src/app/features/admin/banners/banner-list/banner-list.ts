import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { injectQuery, injectMutation, injectQueryClient } from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';
import { BannerService } from '../../../../core/services/banner.service';
import { BannerPosition } from '../../../../core/models/banner.model';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-banner-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './banner-list.html',
  styleUrl: './banner-list.css',
})
export class BannerListComponent {
  private bannerService = inject(BannerService);
  private queryClient = injectQueryClient();
  private router = inject(Router);
  public apiUrl = environment.apiUrl;

  // Signal Filters
  isActiveFilter = signal<string>('all');
  positionFilter = signal<string>('all');

  // TanStack Query for Banners
  bannersQuery = injectQuery(() => {
    const activeState = this.isActiveFilter();
    const posState = this.positionFilter();

    const isActive = activeState === 'all' ? undefined : activeState === 'true';
    const position = posState === 'all' ? undefined : Number(posState);

    return {
      queryKey: ['banners', { isActive, position }],
      queryFn: () => lastValueFrom(this.bannerService.getBanners(isActive, position))
    };
  });

  // Toggle Active Mutation
  toggleActiveMutation = injectMutation(() => ({
    mutationFn: (id: string) => lastValueFrom(this.bannerService.toggleBannerActive(id)),
    onSuccess: () => {
      this.queryClient.invalidateQueries({ queryKey: ['banners'] });
    },
    onError: (err) => {
      console.error('BannerListComponent - Failed to toggle active status:', err);
      alert('Failed to toggle active status. Please try again.');
    }
  }));

  // Delete Banner Mutation
  deleteMutation = injectMutation(() => ({
    mutationFn: (id: string) => lastValueFrom(this.bannerService.deleteBanner(id)),
    onSuccess: () => {
      this.queryClient.invalidateQueries({ queryKey: ['banners'] });
    },
    onError: (err) => {
      console.error('BannerListComponent - Failed to delete banner:', err);
      alert('Failed to delete banner. Please try again.');
    }
  }));

  onToggleActive(id: string, event: Event): void {
    event.stopPropagation(); // Prevent card click navigation
    this.toggleActiveMutation.mutate(id);
  }

  onCardClick(id: string): void {
    this.router.navigate(['/admin/banners/edit', id]);
  }

  onDeleteBanner(id: string, event: Event): void {
    event.stopPropagation(); // Prevent card click navigation
    if (confirm('Are you sure you want to delete this banner?')) {
      this.deleteMutation.mutate(id);
    }
  }


  getPositionName(position: number): string {
    switch (position) {
      case BannerPosition.HomePageHero:
        return 'Homepage Hero Carousel';
      case BannerPosition.AllProductsTop:
        return 'Product List Top Header';
      case BannerPosition.CartPageBottom:
        return 'Cart Page Footer Ad';
      case BannerPosition.PromotionPopup:
        return 'Promotion modal popup';
      default:
        return 'Unknown Position';
    }
  }

  onActiveFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.isActiveFilter.set(value);
  }

  onPositionFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.positionFilter.set(value);
  }
}

