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
        path: 'categories',
        loadComponent: () => import('./categories/category-list/category-list').then(m => m.CategoryListComponent)
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
        path: 'orders',
        loadComponent: () => import('./orders/order-list/order-list').then(m => m.OrderListComponent)
      }
    ]
  }
];
