import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  // Redirect root to products
  { path: '', redirectTo: '/products', pathMatch: 'full' },
  // Lazy-load product-management feature
  { 
      path: 'products', 
      loadChildren: () => import('./features/product-management/product-management.module').then(m => m.ProductManagementModule) 
  },
  // Wildcard fallback
  { path: '**', redirectTo: '/products' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}