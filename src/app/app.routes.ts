import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.routes').then(m => m.routes)
  },
  {
    path: '',
    redirectTo: 'admin',
    pathMatch: 'full'
  }
];
