import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { PaginatedResponse, Product, ProductQueryParams, FilterState } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private baseUrl = '/api/products';

  constructor(private http: HttpClient) {}

  getProducts(params: ProductQueryParams & { filters?: FilterState }): Observable<PaginatedResponse<Product>> {
    let httpParams = new HttpParams()
      .set('page', params.page.toString())
      .set('size', params.size.toString())
      .set('sortBy', params.sortBy)
      .set('sortDir', params.sortDir);

    if (params.searchQuery) {
      httpParams = httpParams.set('query', params.searchQuery);
    }

    // --- CORRECCIÓN para TS2741: Agregando la propiedad 'category' ---
    const sampleProducts: Product[] = [
      {
        id: 'p1',
        name: 'Auriculares Inalámbricos X200',
        price: 79.99,
        discountPrice: 59.99,
        discountPercentage: 25,
        imageUrl: 'assets/audifonos.jpeg',
        rating: 4.5,
        description: 'Auriculares con cancelación de ruido y batería de larga duración.',
        stock: 12,
        category: ['Audio', 'Electrónicos'] // <--- AGREGADO
      },
      {
        id: 'p2',
        name: 'Teclado Mecánico KMX',
        price: 129.99,
        discountPrice: 119.99,
        discountPercentage: 8,
        imageUrl: 'assets/teclado.jpeg',
        rating: 4.7,
        description: 'Teclado mecánico RGB con switches ópticos.',
        stock: 5,
        category: ['Gaming', 'Computadoras'] // <--- AGREGADO
      }
    ,
      {
        id: 'p3',
        name: 'Auriculares Gamer Pro G7',
        price: 99.99,
        discountPercentage: 0,
        imageUrl: 'assets/audifonosgamer.jpeg',
        rating: 4.8,
        description: 'Sumérgete en el juego con sonido 7.1 surround y micrófono con cancelación de ruido.',
        stock: 20,
        category: ['Gaming', 'Audio', 'Electrónicos']
      },
      {
        id: 'p4',
        name: 'Mouse Óptico Ergonómico M5',
        price: 49.99,
        discountPrice: 39.99,
        discountPercentage: 20,
        imageUrl: 'assets/mouse.jpeg',
        rating: 4.6,
        description: 'Mouse de alta precisión con diseño ergonómico para largas sesiones de trabajo o juego.',
        stock: 35,
        category: ['Computadoras', 'Gaming']
      },
      {
        id: 'p5',
        name: 'Laptop Gamer X-Force',
        price: 1499.99,
        discountPrice: 1399.99,
        discountPercentage: 7,
        imageUrl: 'assets/laptop.jpeg',
        rating: 4.9,
        description: 'Laptop de última generación con tarjeta gráfica dedicada y pantalla de 144Hz.',
        stock: 8,
        category: ['Gaming', 'Computadoras', 'Electrónicos']
      },
      {
        id: 'p6',
        name: 'Control Inalámbrico Pro',
        price: 69.99,
        discountPercentage: 0,
        imageUrl: 'assets/control.jpeg',
        rating: 4.7,
        description: 'Control compatible con PC y consolas, con vibración háptica y gatillos adaptativos.',
        stock: 0, // 🚨 CLAVE: Producto agotado
        category: ['Gaming', 'Accesorios']
      }
    ];

    let filteredProducts = [...sampleProducts];

    // 🚨 CLAVE: Aplicar filtro de búsqueda por texto si existe.
    if (params.searchQuery) {
      const query = params.searchQuery.toLowerCase().trim();
      filteredProducts = filteredProducts.filter(product =>
        product.name.toLowerCase().includes(query)
      );
    }

    // Aplicar filtros si existen
    if (params.filters) {
      const { categories, minPrice, maxPrice, inStock, onSale, minRating } = params.filters;
      // Filtrar por categoría
      if (categories && categories.length > 0) {
        filteredProducts = filteredProducts.filter(product => 
          product.category.some(cat => categories.includes(cat))
        );
      }

      // Filtrar por precio mínimo
      if (minPrice != null) {
        filteredProducts = filteredProducts.filter(product => 
          (product.discountPrice ?? product.price) >= minPrice
        );
      }

      // Filtrar por precio máximo
      if (maxPrice != null && maxPrice > 0) {
        filteredProducts = filteredProducts.filter(product => 
          (product.discountPrice ?? product.price) <= maxPrice
        );
      }

      // Filtrar por disponibilidad
      if (inStock) {
        filteredProducts = filteredProducts.filter(product => product.stock > 0);
      }

      // Filtrar por promoción
      if (onSale) {
        filteredProducts = filteredProducts.filter(product => product.discountPercentage > 0);
      }

      // Filtrar por puntuación mínima
      if (minRating != null) {
        filteredProducts = filteredProducts.filter(product => product.rating >= minRating);
      }
    }

    // 🚨 CLAVE: Aplicar ordenamiento
    if (params.sortBy && params.sortBy !== 'featured') {
      filteredProducts.sort((a, b) => {
        const valA = params.sortBy === 'price' ? (a.discountPrice ?? a.price) : a.name;
        const valB = params.sortBy === 'price' ? (b.discountPrice ?? b.price) : b.name;

        if (valA < valB) {
          return params.sortDir === 'asc' ? -1 : 1;
        }
        if (valA > valB) {
          return params.sortDir === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    // ... resto de la simulación del mock ...
    const mock: PaginatedResponse<Product> = {
      content: filteredProducts,
      number: params.page,
      size: params.size,
      totalElements: filteredProducts.length,
      totalPages: 1,
      first: true,
      last: true
    };

    return of(mock);
  }

  updateStock(productId: string, newStock: number): Observable<Product> {
    const url = `${this.baseUrl}/${productId}/stock`;
    return this.http.put<Product>(url, { stock: newStock });
  }
}