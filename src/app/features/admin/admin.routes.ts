import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './admin-layout/admin-layout';

export const routes: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/dashboard').then(m => m.DashboardComponent)
      },
      {
        path: 'products',
        loadComponent: () => import('./products/product-list/product-list').then(m => m.ProductListComponent)
      },
      {
        path: 'products/new',
        loadComponent: () => import('./products/product-form/product-form').then(m => m.ProductFormComponent)
      },
      {
        path: 'products/edit/:id',
        loadComponent: () => import('./products/product-form/product-form').then(m => m.ProductFormComponent)
      },
      {
        path: 'categories',
        loadComponent: () => import('./categories/category-list/category-list').then(m => m.CategoryListComponent)
      },
      {
        path: 'categories/new',
        loadComponent: () => import('./categories/category-form/category-form').then(m => m.CategoryFormComponent)
      },
      {
        path: 'categories/edit/:id',
        loadComponent: () => import('./categories/category-form/category-form').then(m => m.CategoryFormComponent)
      },
      {
        path: 'brands',
        loadComponent: () => import('./brands/brand-list/brand-list').then(m => m.BrandListComponent)
      },
      {
        path: 'brands/new',
        loadComponent: () => import('./brands/brand-form/brand-form').then(m => m.BrandFormComponent)
      },
      {
        path: 'brands/edit/:id',
        loadComponent: () => import('./brands/brand-form/brand-form').then(m => m.BrandFormComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./users/user-list/user-list').then(m => m.UserListComponent)
      },
      {
        path: 'banners',
        loadComponent: () => import('./banners/banner-list/banner-list').then(m => m.BannerListComponent)
      },
      {
        path: 'banners/new',
        loadComponent: () => import('./banners/banner-form/banner-form').then(m => m.BannerFormComponent)
      },
      {
        path: 'banners/edit/:id',
        loadComponent: () => import('./banners/banner-form/banner-form').then(m => m.BannerFormComponent)
      },
      {
        path: 'orders',
        loadComponent: () => import('./orders/order-list/order-list').then(m => m.OrderListComponent)
      },
      {
        path: 'inventory',
        loadComponent: () => import('./inventory/inventory').then(m => m.InventoryComponent)
      },
      {
        path: 'returns',
        loadComponent: () => import('./returns/return-list').then(m => m.ReturnListComponent)
      }
    ]
  }
];
