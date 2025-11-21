import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Standalone components (Importados directamente, no declarados)
import { ProductListComponent } from './components/product-list/product-list';
import { ProductCardComponent } from './components/product-card/product-card';
import { ProductFiltersComponent } from './components/product-filters/product-filters';
import { PaginationBarComponent } from './components/pagination-bar/pagination-bar';
import { ProductFormComponent } from './components/product-form/product-form.component';
import { ProductsAdminComponent } from './components/product-admin-management/products-admin';

// Define las rutas para este módulo (Rutas hijas de '/products')
const routes: Routes = [ 
    // Cuando la URL es /products, se carga ProductListComponent
    { path: '', component: ProductListComponent },
    // 🚨 CLAVE: Nueva ruta para el formulario de creación
    { path: 'new', component: ProductFormComponent },
    { path: 'admin', component: ProductsAdminComponent}
];

@NgModule({
  declarations: [], 
  imports: [
    CommonModule, // Necesario para *ngIf, *ngFor (los warnings originales)
    FormsModule,
    ReactiveFormsModule,
    
    // Configura las rutas hijas (lazy loaded)
    RouterModule.forChild(routes), 
  ],
  
  exports: []
})
export class ProductManagementModule {}