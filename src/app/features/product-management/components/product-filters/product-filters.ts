import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FilterState } from '../../models/product.model';

@Component({
  selector: 'app-product-filters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './product-filters.html',
  styleUrls: ['./product-filters.css']
})
export class ProductFiltersComponent implements OnInit {
  @Input() initialFilterState: FilterState = {
    categories: [],
    minPrice: 0,
    maxPrice: 0,
    inStock: false,
    onSale: false,
    minRating: 0
  };
  @Output() filtersChange = new EventEmitter<FilterState>();
  @Output() close = new EventEmitter<void>(); // Evento para cerrar el panel

  // Usamos la aserción de no-nulo, inicializada en ngOnInit.
  filterState!: FilterState;

  // For accordion state
  accordionStates: { [key: string]: boolean } = {
    categories: false,
    price: false,
    rating: false,
    stock: false,
    sale: false
  };

  // New property for star rating
  selectedRating: number = 0;

  // CLAVE: Se recibe la lista de categorías desde el componente padre.
  @Input() availableCategories: { name: string; count: number }[] = [];

  ngOnInit(): void {
    // CLAVE: Se inicializa filterState aquí
    this.filterState = { ...this.initialFilterState };

    // Initialize selectedRating from filterState.minRating
    this.selectedRating = this.filterState.minRating || 0;
  }

  toggleAccordion(key: string): void {
    this.accordionStates[key] = !this.accordionStates[key];
  }

  // Método para emitir el evento de cierre
  onClose(): void {
    this.close.emit();
  }

  // Method to handle star clicks
  selectRating(rating: number): void {
    // If the same rating is clicked again, reset it to 0 (no filter)
    if (this.selectedRating === rating) {
      this.selectedRating = 0;
    } else {
      this.selectedRating = rating;
    }
    this.filterState.minRating = this.selectedRating;
    this.applyFilters();
  }

  // Other filter change handlers (checkboxes, price inputs, etc.)
  onCategoryChange(category: string, event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    if (isChecked) {
      this.filterState.categories.push(category);
    } else {
      this.filterState.categories = this.filterState.categories.filter(c => c !== category);
    }
    this.applyFilters();
  }

  onMinPriceChange(event: Event): void {
    this.filterState.minPrice = parseFloat((event.target as HTMLInputElement).value) || 0;
    this.applyFilters();
  }

  onMaxPriceChange(event: Event): void {
    this.filterState.maxPrice = parseFloat((event.target as HTMLInputElement).value) || 0;
    this.applyFilters();
  }

  onInStockChange(event: Event): void {
    this.filterState.inStock = (event.target as HTMLInputElement).checked;
    this.applyFilters();
  }

  onOnSaleChange(event: Event): void {
    this.filterState.onSale = (event.target as HTMLInputElement).checked;
    this.applyFilters();
  }

  applyFilters(): void {
    // Emit a copy to ensure immutability if needed by parent
    this.filtersChange.emit({ ...this.filterState });
  }

  clearFilters(): void {
    this.filterState = {
      categories: [],
      minPrice: 0,
      maxPrice: 0,
      inStock: false,
      onSale: false,
      minRating: 0
    };
    this.selectedRating = 0; // Reset selected stars
    this.filtersChange.emit({ ...this.filterState });
  }

  // CLAVE: Lógica para saber si hay filtros activos y mostrar el botón "Limpiar"
  isAnyFilterActive(): boolean {
    if (!this.filterState) return false;
    const state = this.filterState;
    return (
      state.categories.length > 0 ||
      state.minPrice > 0 ||
      state.maxPrice > 0 || 
      (state.minRating || 0) > 0 || 
      state.inStock ||
      state.onSale === true
    );
  }

  // CLAVE: Métodos para eliminar filtros individuales desde los chips
  removeCategory(categoryToRemove: string): void {
    this.filterState.categories = this.filterState.categories.filter(c => c !== categoryToRemove);
    this.applyFilters();
  }

  removePriceFilter(): void {
    this.filterState.minPrice = 0;
    this.filterState.maxPrice = 0;
    this.applyFilters();
  }

  removeRatingFilter(): void {
    this.selectedRating = 0;
    this.filterState.minRating = 0;
    this.applyFilters();
  }

  // CLAVE: Getter para formatear el rango de precios para el chip
  get formattedPriceRange(): string {
    if (!this.filterState) return '';
    const min = this.filterState.minPrice;
    const max = this.filterState.maxPrice;

    if (min === 0 && max === 0) {
      return '';
    }
    
    const minStr = `€${min}`;
    const maxStr = max > 0 ? `€${max}` : '∞';

    if (min > 0 && max === 0) {
      return `Desde ${minStr}`;
    }
    if (min === 0 && max > 0) {
      return `Hasta ${maxStr}`;
    }

    return `${minStr} - ${maxStr}`;
  }

  // CLAVE: Getter para controlar la visibilidad del chip de puntuación (CORREGIDO TS2532)
  get showMinRatingChip(): boolean {
    // Usa encadenamiento opcional y || 0 para un control booleano seguro
    return (this.filterState?.minRating || 0) > 0;
  }

  // CLAVE: Getter para acceder a la puntuación de forma segura (CORREGIDO TS2322)
  get minRatingValue(): number {
    // Usa encadenamiento opcional y coalescencia nula para garantizar que el tipo devuelto sea 'number'
    return this.filterState?.minRating ?? 0;
  }
}