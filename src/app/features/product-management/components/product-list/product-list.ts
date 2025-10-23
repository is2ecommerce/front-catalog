import { Component, OnInit } from '@angular/core';
import { FilterState, Product, PaginatedResponse, ProductQueryParams } from '../../models/product.model';
import { ProductService } from '../../services/product.service';
import { Observable, switchMap, tap, BehaviorSubject, map } from 'rxjs';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ProductFiltersComponent } from '../product-filters/product-filters';
import { ProductCardComponent } from '../product-card/product-card';
import { PaginationBarComponent } from '../pagination-bar/pagination-bar';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    CommonModule,
    ProductFiltersComponent,
    ProductCardComponent,
    PaginationBarComponent
  ],
  templateUrl: './product-list.html',
  styleUrls: ['./product-list.css']
})
export class ProductListComponent implements OnInit {
  
  // Observable que contiene toda la respuesta paginada del backend
  paginatedResponse$!: Observable<PaginatedResponse<Product>>;
  
  // Observable que solo extrae el array de productos para el *ngFor
  products$!: Observable<Product[]>;

  // Subject que emite un valor cuando se debe recargar la lista (paginación, filtros, búsqueda)
  private reloadSubject = new BehaviorSubject<ProductQueryParams>({
      page: 0,
      size: 8,
      sortBy: 'featured',
      sortDir: 'asc'
  });

  // Estado de filtros/paginación
  queryParams: ProductQueryParams = this.reloadSubject.value;

  viewMode: 'grid' | 'list' = 'grid';

  // 🚨 CLAVE: Se añaden las categorías y la función de conteo para pasarlas al componente hijo.
  // En una aplicación real, esto vendría de un servicio.
  categories: string[] = ['Audio', 'Electrónicos', 'Gaming', 'Computadoras'];
  // Esta función es un placeholder, idealmente el conteo vendría del backend.
  getCategoryCount = (category: string): number => 1;

  constructor(
    private productService: ProductService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    
    // Combina los cambios de la URL (búsqueda) con los cambios internos (paginación/filtros)
  this.paginatedResponse$ = this.route.queryParams.pipe(
      // 1. Obtener queryParams de la URL (siempre que la URL cambie, dispara reloadSubject)
      tap(urlParams => this.updateQueryParamsFromUrl(urlParams)),
      
      // 2. Usar el reloadSubject para iniciar la petición API (switchMap cancela peticiones antiguas)
      switchMap(() => this.reloadSubject),
      
      // 3. Llamar al servicio con los parámetros actuales
      switchMap(params => {
        return this.productService.getProducts(params).pipe(
          tap((response: PaginatedResponse<Product>) => {
            // Actualiza el estado local de paginación con los valores reales del backend
            this.queryParams.page = response.number;
            this.queryParams.size = response.size;
          })
        );
      })
    );
    
    // Extrae solo el array de productos para el template
    this.products$ = this.paginatedResponse$
      .pipe(
        // response is PaginatedResponse<Product>, extract content array
        map((response: PaginatedResponse<Product>) => response.content)
      );
  }
  
  private updateQueryParamsFromUrl(urlParams: Params): void {
      this.queryParams.searchQuery = urlParams['query'] || '';
      // Si la URL tiene 'page', la usamos (el backend usa 0-indexed, la URL usa 1-indexed)
      this.queryParams.page = urlParams['page'] ? parseInt(urlParams['page']) - 1 : 0;
      this.reloadSubject.next(this.queryParams);
  }

  // Tarea de Gabriel/Samuel: Implementar la navegación
  onPageChange(pageIndex: number): void {
    // 1. Actualiza el estado del componente
    this.queryParams.page = pageIndex; 
    
    // 2. Dispara la recarga de datos llamando al backend
    this.reloadSubject.next(this.queryParams);
    
    // Opcional: Actualizar la URL para persistir la paginación al recargar (Buena Práctica)
    this.router.navigate([], { 
        queryParams: { page: pageIndex + 1 }, 
        queryParamsHandling: 'merge' 
    });
  }
  
  // Tarea de Gabriel/César: Manejar cambio de filtros
  onFiltersChange(newFilters: FilterState): void {
      this.queryParams.filters = newFilters; // 🚨 CLAVE: Se asignan los nuevos filtros a la consulta.
      this.queryParams.page = 0; // Siempre vuelve a la página 1 al filtrar
      this.reloadSubject.next(this.queryParams);
  }
  
  onSortChange(sortBy: string): void {
    // El valor viene como "campo-direccion", ej: "price-asc"
    const [sortField, sortDir] = sortBy.split('-');
    this.queryParams.sortBy = sortField;
    this.queryParams.sortDir = (sortDir as 'asc' | 'desc') || 'asc';
    this.queryParams.page = 0; // Volver a la primera página al reordenar
    this.reloadSubject.next(this.queryParams);
  }

  // Setter de la vista (Grid/List)
  setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode = mode;
  }
}
