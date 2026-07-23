import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./customer-layout/customer-layout').then(m => m.CustomerLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./home/home').then(m => m.HomeComponent)
      },
      {
        path: 'products',
        loadComponent: () => import('./catalog/catalog').then(m => m.CatalogComponent)
      },
      {
        path: 'products/:id',
        loadComponent: () => import('./catalog/product-detail/product-detail').then(m => m.ProductDetailComponent)
      },
      {
        path: 'cart',
        loadComponent: () => import('./cart/cart').then(m => m.CartComponent)
      },
      {
        path: 'checkout',
        loadComponent: () => import('./checkout/checkout').then(m => m.CheckoutComponent)
      },
      {
        path: 'wishlist',
        loadComponent: () => import('./wishlist/wishlist').then(m => m.WishlistComponent)
      },
      {
        path: 'orders',
        loadComponent: () => import('./account/order-history/order-history').then(m => m.OrderHistoryComponent)
      },
      {
        path: 'orders/:id',
        loadComponent: () => import('./account/order-detail/order-detail').then(m => m.OrderDetailComponent)
      }
    ]
  }
];
