export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string[];
  image: string;           // usado por product-card
  imageUrl?: string;       // opcional, compatibilidad interna del servicio
  discount?: number;
  rating?: {
    rate: number;
    count: number;
  };
}

export interface PaginatedResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface ProductQueryParams {
  page: number;
  size: number;
  sortBy: string;
  sortDir: 'asc' | 'desc';
  searchQuery?: string;
  filters?: FilterState;
}

export interface FilterState {
  categories: string[];
  minPrice: number;
  priceRange?: [number, number]; // Añadido para compatibilidad con el slider de precios
  maxPrice: number;
  inStock: boolean;
  onSale?: boolean;
  minRating?: number;
}

export interface Category {
  id: string;
  label: string;
  count: number;
}
