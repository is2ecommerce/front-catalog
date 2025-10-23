/**
 * 1. INTERFACE PRINCIPAL: Producto Individual
 * Define la estructura de cada artículo listado.
 * Necesario para ProductCardComponent.
 */
export interface Product {
  id: string;
  name: string;
  price: number;
  discountPrice?: number;
  discountPercentage: number;
  imageUrl?: string;
  imagePath?: string;
  rating: number;
  description: string;
  stock: number;
  category: string[];
}


/**
 * 2. INTERFACE DE RESPUESTA PAGINADA
 * Estructura de la respuesta completa del endpoint /products?page=&size= (Tarea de Diego/Samuel).
 * Necesario para ProductListComponent y ProductService.
 */
export interface PaginatedResponse<T> {
  content: T[]; // El array de productos para el *ngFor
  totalPages: number;
  totalElements: number;
  size: number; // Items por página
  number: number; // Índice de página actual (0-indexed)
  first: boolean;
  last: boolean;
  // Otros campos útiles de paginación (ej. numberOfElements, empty, sort, etc.)
}

/**
 * 3. INTERFACE DE PARÁMETROS DE CONSULTA
 * Estructura de los Query Params que el Frontend envía al Backend (Tarea de Gabriel).
 * Necesario para ProductService.
 */
export interface ProductQueryParams {
  page: number; // Página solicitada (0-indexed)
  size: number; // Tamaño de la página
  sortBy: string; // Campo para ordenar
  sortDir: 'asc' | 'desc'; // Dirección de ordenamiento
  searchQuery?: string; // Tarea de Búsqueda por texto (Tarea de Gabriel/Ortega/Oscar)
  filters?: FilterState; // 🚨 CLAVE: Se añade el estado de los filtros a los parámetros de la consulta.
  // Nota: Los filtros avanzados se manejarían como un objeto serializado o campos separados.
  // Por ejemplo, categoryIds: string[]
}

/**
 * 4. INTERFACE DE ESTADO DE FILTROS (Frontend)
 * Estado manejado por ProductFiltersComponent (Tarea de César).
 */
export interface FilterState {
  categories: string[]; // IDs de categorías seleccionadas
  minPrice: number;
  maxPrice: number;
  inStock: boolean;
  onSale?: boolean;
  minRating?: number;
}

/**
 * 5. INTERFACE DE CATEGORÍA
 * Usada para poblar el ProductFiltersComponent.
 */
export interface Category {
  id: string;
  label: string;
  count: number; // Cantidad de productos en esa categoría
}
