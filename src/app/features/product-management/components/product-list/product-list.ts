import { Component, OnInit, OnDestroy, Renderer2, ViewChild } from '@angular/core';
import { FilterState, Product, PaginatedResponse, ProductQueryParams } from '../../models/product.model';
import { ProductService } from '../../services/product.service';
import { Observable, switchMap, tap, BehaviorSubject, map, shareReplay } from 'rxjs';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ProductFiltersComponent } from '../product-filters/product-filters';
import { ProductCardComponent } from '../product-card/product-card';
import { PaginationBarComponent } from '../pagination-bar/pagination-bar';
 // Asegúrate de que esta importación es correcta.

/**
 * Nuevo modelo para el BannerSlide con todos los datos necesarios.
 */
interface BannerSlide {
  imageUrl: string;
  categoryText: string;
  categoryFilter: string; // Valor que se usará para el filtro.
  title: string;
  subtitle: string;
  ctaText: string;
  backgroundGradient: string;
  accentColor: string;
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
  
  // Referencia al componente de filtros para poder interactuar con él
  @ViewChild(ProductFiltersComponent) filterComponent!: ProductFiltersComponent;
  
  paginatedResponse$!: Observable<PaginatedResponse<Product>>;
  
  products$!: Observable<Product[]>;

  private reloadSubject = new BehaviorSubject<ProductQueryParams>({
      page: 0,
      size: 8,
      sortBy: 'featured',
      sortDir: 'asc'
  });
  
  queryParams: ProductQueryParams = this.reloadSubject.value;

  viewMode: 'grid' | 'list' = 'grid';

  isFiltersVisible = true;

  availableCategories: { name: string; count: number }[] = [];

  isSortDropdownOpen = false;
  sortOptions = [
    { value: 'featured', label: 'Destacados' },
    { value: 'price-asc', label: 'Precio: más bajo' },
    { value: 'price-desc', label: 'Precio: más alto' },
    { value: 'name-asc', label: 'Nombre: A-Z' },
    { value: 'name-desc', label: 'Nombre: Z-A' }
  ];
  selectedSortOption = this.sortOptions[0];

  // --- Nuevos datos del carrusel ---
  bannerSlides: BannerSlide[] = [
    {
      imageUrl: 'https://images.unsplash.com/photo-1754761986430-5d0d44d09d00?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzbWFydHBob25lJTIwbGFwdG9wJTIwdGVjaG5vbG9neXxlbnwxfHx8fDE3NjM2Nzc3MTF8MA&ixlib=rb-4.1.0&q=80&w=1080',
      categoryText: 'TECNOLOGÍA',
      categoryFilter: 'Tecnología',
      title: '¡Hasta 40% OFF en Tecnología!',
      subtitle: 'Los mejores smartphones, laptops y más',
      ctaText: 'Comprar Ahora',
      backgroundGradient: 'linear-gradient(135deg, #1a1f2e 0%, #2d3748 50%, #1e3a5f 100%)',
      accentColor: '#48a3c6'
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1732257119942-a19648e482f2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYXNoaW9uJTIwY2xvdGhpbmclMjBhY2Nlc3Nvcmllc3xlbnwxfHx8fDE3NjM2Nzc3MTF8MA&ixlib=rb-4.1.0&q=80&w=1080',
      categoryText: 'AUDIO',
      categoryFilter: 'Audio',
      title: 'Nueva Colección',
      subtitle: 'Descubre las últimas tendencias en moda',
      ctaText: 'Ver Colección',
      backgroundGradient: 'linear-gradient(135deg, #2d1810 0%, #6b3410 50%, #c85500 100%)',
      accentColor: '#e47911'
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1658848507056-24ba67502b1d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHxzcG9ydHMlMjBmaXRuZXNzJTIwZXF1aXBtZW50fGVufDF8fHx8MTc2MzY0MjQzMHww&ixlib=rb-4.1.0&q=80&w=1080',
      categoryText: 'FOTOGRAFÍA',
      categoryFilter: 'Fotografía',
      title: '¡Muévete con Estilo!',
      subtitle: 'Equípate con lo mejor para tu entrenamiento',
      ctaText: 'Explorar Ahora',
      backgroundGradient: 'linear-gradient(135deg, #1a2f1f 0%, #2d5a3d 50%, #3a7d5c 100%)',
      accentColor: '#48a3c6'
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1595051665600-afd01ea7c446?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHxiZWF1dHklMjBjb3NtZXRpY3MlMjBza2luY2FyZXxlbnwxfHx8fDE3NjM2MDQzMDV8MA&ixlib=rb-4.1.0&q=80&w=1080',
      categoryText: 'OFICINA',
      categoryFilter: 'Oficina',
      title: 'Oferta Especial 30% OFF',
      subtitle: 'Los mejores productos de belleza y cuidado',
      ctaText: 'Descubrir Ofertas',
      backgroundGradient: 'linear-gradient(135deg, #3d2232 0%, #6b3a5a 50%, #a85088 100%)',
      accentColor: '#e47911'
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1662059361834-d361807d63e7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob21lJTIwZGVjb3IlMjBmdXJuaXR1cmV8ZW58MXx8fHwxNjM2MDQzMDR8MA&ixlib=rb-4.1.0&q=80&w=1080',
      categoryText: 'HOGAR',
      categoryFilter: 'Hogar',
      title: 'Renueva tu Espacio',
      subtitle: 'Decoración y muebles con envío gratis',
      ctaText: 'Comprar Ahora',
      backgroundGradient: 'linear-gradient(135deg, #2a2218 0%, #4a3e2d 50%, #6b5a42 100%)',
      accentColor: '#48a3c6'
    }
  ];
  currentSlideIndex = 0;
  private slideInterval: any;
  
  constructor(
    private productService: ProductService,
    private route: ActivatedRoute,
    private router: Router,
    private renderer: Renderer2,
    // Asegúrate de tener una referencia al componente de filtros para llamar a su método
    // @ViewChild('filterComponent') filterComponent!: ProductFiltersComponent; 
  ) {}

  ngOnInit(): void {
    this.updateCategoryCounts();
    
    this.paginatedResponse$ = this.route.queryParams.pipe(
      tap(urlParams => this.updateQueryParamsFromUrl(urlParams)),
      
      switchMap(() => this.reloadSubject),
      
      switchMap(params => {
        console.log('🔄 Fetching products with params:', params);
        return this.productService.getProducts(params).pipe(
          tap((response: PaginatedResponse<Product>) => {
            console.log('✅ Received response:', response.totalElements, 'products');
            this.queryParams.page = response.number;
            this.queryParams.size = response.size;
          })
        );
      }),
      shareReplay(1)
    );
    
    this.products$ = this.paginatedResponse$
      .pipe(
        map((response: PaginatedResponse<Product>) => response.content)
      );    this.startAutoSlide();
  }
  
  ngOnDestroy(): void {
    this.stopAutoSlide();
  }
  
  // Método para aplicar el filtro de categoría al hacer clic en el botón del banner
  applyCategoryFilter(category: string): void {
    console.log('🎯 Banner category clicked:', category);
    
    // Crear un nuevo FilterState con solo esta categoría
    const newFilters: FilterState = {
      categories: [category],
      minPrice: 0,
      maxPrice: 0,
      inStock: false,
      onSale: false,
      minRating: 0
    };
    
    // Aplicar el filtro usando el método estándar
    this.onFiltersChange(newFilters);
    
    // Mostrar el panel de filtros para que el usuario vea el filtro aplicado
    if (!this.isFiltersVisible) {
      this.isFiltersVisible = true;
    }
  }  private updateCategoryCounts(): void {
    this.productService.getAll().subscribe(allProducts => {
      const categoryNames = [
        'Tecnología',
        'Audio',
        'Fotografía',
        'Hogar',
        'Oficina'
      ];
      const counts: { [key: string]: number } = {};      categoryNames.forEach(name => counts[name] = 0);

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
      this.queryParams.page = urlParams['page'] ? parseInt(urlParams['page']) - 1 : 0;
      this.reloadSubject.next(this.queryParams);
  }

  onPageChange(pageIndex: number): void {
    this.queryParams.page = pageIndex; 
    
    this.reloadSubject.next(this.queryParams);
    
    this.router.navigate([], { 
        queryParams: { page: pageIndex + 1 }, 
        queryParamsHandling: 'merge' 
    });
  }
  
  onFiltersChange(newFilters: FilterState): void {
      console.log('🔧 onFiltersChange called with:', newFilters);
      this.queryParams.filters = newFilters;
      this.queryParams.page = 0; // Siempre vuelve a la página 1 al filtrar
      console.log('🔧 Updated queryParams:', this.queryParams);
      this.reloadSubject.next(this.queryParams);
  }  onSortChange(sortBy: string): void {
    const [sortField, sortDir] = sortBy.split('-');
    this.queryParams.sortBy = sortField;
    this.queryParams.sortDir = (sortDir as 'asc' | 'desc') || 'asc';
    this.queryParams.page = 0;
    this.reloadSubject.next(this.queryParams);
  }

  setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode = mode;
  }

  toggleFilters(): void {
    this.isFiltersVisible = !this.isFiltersVisible;
  }
  
  toggleSortDropdown(): void {
    this.isSortDropdownOpen = !this.isSortDropdownOpen;
  }

  selectSortOption(option: any): void {
    this.selectedSortOption = option;
    this.onSortChange(option.value);
    this.isSortDropdownOpen = false;
  }

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

  goToSlide(index: number): void {
    this.stopAutoSlide();
    this.currentSlideIndex = index;
    this.startAutoSlide();
  }

  // --- El color de acento del punto activo debe ser dinámico ---
  getCurrentAccentColor(): string {
    return this.bannerSlides[this.currentSlideIndex]?.accentColor || '#48a3c6';
  }

  private startAutoSlide(): void {
    this.slideInterval = setInterval(() => {
      this.nextSlide();
    }, 7000);
  }

  private stopAutoSlide(): void {
    clearInterval(this.slideInterval);
  }
}
