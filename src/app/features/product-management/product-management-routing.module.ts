import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Asegúrate de que la ruta de importación sea correcta
import { ProductListComponent } from './components/product-list/product-list'; 

const routes: Routes = [
    { 
        // path: '' significa la ruta raíz dentro de este módulo.
        // Como se carga con lazy loading en '/products', la URL final será '/products'
        path: '', 
        component: ProductListComponent // <-- ¡Esto inyecta la lista de productos!
    },
    // Si tienes un componente para editar, iría en 'edit'
    // { path: 'edit/:id', component: ProductEditComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)], // IMPORTANTE: Usar forChild()
  exports: [RouterModule]
})
export class ProductManagementRoutingModule { }