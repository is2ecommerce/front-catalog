import { Component, OnInit, OnDestroy } from '@angular/core';
import { FilterState, Product, PaginatedResponse, ProductQueryParams } from '../../models/product.model';
import { ProductService } from '../../services/product.service';
import { Observable, switchMap, tap, BehaviorSubject, map } from 'rxjs';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ProductFiltersComponent } from '../product-filters/product-filters';
import { ProductCardComponent } from '../product-card/product-card';
import { PaginationBarComponent } from '../pagination-bar/pagination-bar';

// Interfaz para tipificar los slides del banner
interface BannerSlide {
  type: 'text' | 'video' | 'image'; // 🚨 Añadir 'image'
  title?: string;
  description?: string;
  videoSrc?: string;
  imageUrl?: string; // 🚨 Añadir 'imageUrl' opcional
}

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    CommonModule,
    ProductFiltersComponent,
    ProductCardComponent,
    PaginationBarComponent,
  ],
  templateUrl: './product-list.html',
  styleUrls: ['./product-list.css']
})
export class ProductListComponent implements OnInit, OnDestroy {
  
  // Observable que contiene toda la respuesta paginada del backend
  paginatedResponse$!: Observable<PaginatedResponse<Product>>;
  
  // Observable que solo extrae el array de productos para el *ngFor
  products$!: Observable<Product[]>;

  // Subject que emite un valor cuando se debe recargar la lista
  private reloadSubject = new BehaviorSubject<ProductQueryParams>({
      page: 0,
      size: 8,
      sortBy: 'featured',
      sortDir: 'asc'
  });

  // Estado de filtros/paginación
  queryParams: ProductQueryParams = this.reloadSubject.value;

  viewMode: 'grid' | 'list' = 'grid';

  // Estado para controlar la visibilidad del panel de filtros
  isFiltersVisible = true;

  // Propiedad para pasar las categorías con conteo dinámico al componente hijo.
  availableCategories: { name: string; count: number }[] = [];

  // CLAVE: Estado y opciones para el nuevo menú desplegable de ordenamiento
  isSortDropdownOpen = false;
  sortOptions = [
    { value: 'featured', label: 'Destacados' },
    { value: 'price-asc', label: 'Precio: más bajo' },
    { value: 'price-desc', label: 'Precio: más alto' },
    { value: 'name-asc', label: 'Nombre: A-Z' },
    { value: 'name-desc', label: 'Nombre: Z-A' }
  ];
  selectedSortOption = this.sortOptions[0];

  // --- INICIO DE LA LÓGICA DEL CARRUSEL ---
  bannerSlides: BannerSlide[] = [
    { type: 'video', title: '¡Grandes Descuentos!', description: 'No te pierdas nuestras ofertas exclusivas.', videoSrc: 'assets/Banner1.mp4' },
    { type: 'video', title: 'Nuevos Ingresos', description: 'Explora lo último en tecnología que acaba de llegar.', videoSrc: 'assets/Banner2.mp4' },
    { type: 'video', title: 'Calidad Garantizada', description: 'Soporte y garantía en todos nuestros productos.', videoSrc: 'assets/Banner3.mp4' }
  ];
  currentSlideIndex = 0;
  private slideInterval: any;
  // --- FIN DE LA LÓGICA DEL CARRUSEL ---

  constructor(
    private productService: ProductService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {

    // CLAVE: Se calcula el conteo de productos por categoría dinámicamente.
    this.updateCategoryCounts();
    
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
        map((response: PaginatedResponse<Product>) => response.content)
      );

    // Iniciar el carrusel automático
    this.startAutoSlide();
  }
  
  ngOnDestroy(): void {
    // Limpiar el temporizador para evitar fugas de memoria
    this.stopAutoSlide();
  }

  private updateCategoryCounts(): void {
    // CLAVE: Se suscribe al servicio para obtener la lista REAL de productos
    // y calcular los contadores basados en los datos actuales.
    this.productService.getAll().subscribe(allProducts => {
      const categoryNames = ['Audio', 'Electrónicos', 'Gaming', 'Computadoras', 'Accesorios'];
      const counts: { [key: string]: number } = {};

      // Inicializar contadores
      categoryNames.forEach(name => counts[name] = 0);

      // Contar productos por categoría desde la lista real
      allProducts.forEach(product => {
          if (product.category) {
              product.category.forEach(catName => {
                  if (counts.hasOwnProperty(catName)) {
                      counts[catName]++;
                  }
              });
          }
      });

      this.availableCategories = categoryNames.map(name => ({ name, count: counts[name] }));
    });
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

  // Método para mostrar/ocultar el panel de filtros
  toggleFilters(): void {
    this.isFiltersVisible = !this.isFiltersVisible;
  }

  // ----------------------------------------------------------------------
  // MÉTODOS DEL MENÚ DESPLEGABLE DE ORDENAMIENTO
  // ----------------------------------------------------------------------
  
  toggleSortDropdown(): void {
    this.isSortDropdownOpen = !this.isSortDropdownOpen;
  }

  selectSortOption(option: any): void {
    this.selectedSortOption = option;
    this.onSortChange(option.value);
    this.isSortDropdownOpen = false;
  }

  // --- MÉTODOS PARA EL CARRUSEL DEL BANNER ---
  prevSlide(): void {
    this.stopAutoSlide();
    const newIndex = this.currentSlideIndex - 1;
    this.currentSlideIndex = newIndex < 0 ? this.bannerSlides.length - 1 : newIndex;
    this.startAutoSlide();
  }

  nextSlide(): void {
    this.stopAutoSlide();
    const newIndex = this.currentSlideIndex + 1;
    this.currentSlideIndex = newIndex >= this.bannerSlides.length ? 0 : newIndex;
    this.startAutoSlide();
  }

  private startAutoSlide(): void {
    this.slideInterval = setInterval(() => {
      this.nextSlide();
    }, 7000); // Cambia cada 7 segundos
  }

  private stopAutoSlide(): void {
    clearInterval(this.slideInterval);
  }
}