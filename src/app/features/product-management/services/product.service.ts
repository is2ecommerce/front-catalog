import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { PaginatedResponse, Product, ProductQueryParams, FilterState } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private baseUrl = '/api/products';

  // Subject centralizado para que admin y catálogo compartan estado en tiempo real
  private _products = new BehaviorSubject<Product[]>([]);
  products$ = this._products.asObservable();

  constructor(private http: HttpClient) {

  if ((this._products.value?.length ?? 0) === 0) {
      const samples = this._defaultSampleProducts();
      // mapear aliases para compatibilidad con templates que usan campos en español
      const mapped = samples.map(p => this._withAliases(p));
      this.loadInitial(mapped);
    }
  }

private _withAliases(p: Product): Product {
    return {
      ...p,
      nombre: (p as any).name ?? (p as any).nombre,
      descripcion: (p as any).description ?? (p as any).descripcion,
      precio: (p as any).price ?? (p as any).precio,
      imagen: (p as any).imageUrl ?? (p as any).imagen
    } as Product & any;
  }

  // Extrae el array sample original en una función reutilizable
  private _defaultSampleProducts(): Product[] {
    return [
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
        category: ['Audio', 'Electrónicos']
      },
      // ...resto de items
    ];
  }

   private _normalizeProduct(p: any): Product {
    const id = p.id ?? p._id ?? String(Date.now());
    const name = (p.name ?? p.nombre ?? '').toString();
    const price = (p.price ?? p.precio ?? 0) as number;
    const description = (p.description ?? p.descripcion ?? '').toString();
    const stock = (p.stock ?? 0) as number;
    const category = (p.category ?? p.categoria ?? []) as string[];
    const rating = (p.rating ?? 0) as number;
    const discountPrice = (p.discountPrice ?? p.precio ?? undefined) as any;
    const discountPercentage = (p.discountPercentage ?? 0) as number;

    // Normalizar la imagen: aceptar imageUrl, imagen, image, url; soportar File y base64/data urls
    const rawImage = p.imageUrl ?? p.imagen ?? p.image ?? p.url ?? '';
    let imageUrl = '';

    if (rawImage instanceof File) {
      imageUrl = URL.createObjectURL(rawImage);
    } else if (typeof rawImage === 'string') {
      imageUrl = rawImage.trim();
    } else {
      imageUrl = '';
    }

    const normalized: Product = {
      ...p,
      id,
      name,
      price,
      description,
      imageUrl,
      stock,
      category,
      rating,
      discountPrice,
      discountPercentage
    } as Product;

    // añadir aliases para compatibilidad con templates en español
    (normalized as any).nombre = name;
    (normalized as any).descripcion = description;
    (normalized as any).precio = price;
    (normalized as any).imagen = imageUrl;

    return normalized;
  }


  

  // Devuelve observable con lista completa (no paginada)
  getAll(): Observable<Product[]> {
    return this.products$;
  }

  // Inicializar/sembrar datos en el BehaviorSubject (útil para entorno sin backend)
  loadInitial(products: Product[]) {
    const normalized = (products ?? []).map(p => this._withAliases(this._normalizeProduct(p)));
    this._products.next(normalized);
  }

  // Método existente para paginado/simulación; ahora usa el state central si existe
  getProducts(params: ProductQueryParams & { filters?: FilterState }): Observable<PaginatedResponse<Product>> {
    let httpParams = new HttpParams()
      .set('page', params.page.toString())
      .set('size', params.size.toString())
      .set('sortBy', params.sortBy)
      .set('sortDir', params.sortDir);

    if (params.searchQuery) {
      httpParams = httpParams.set('query', params.searchQuery);
    }

    // Mock base (se usa sólo si _products está vacío)
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
        category: ['Audio', 'Electrónicos']
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
        category: ['Gaming', 'Computadoras']
      },
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
        stock: 0,
        category: ['Gaming', 'Accesorios']
      }
    ];

    // usar el estado central si ya contiene productos, si no usar el mock
    const initialProducts: Product[] = (this._products?.value && this._products.value.length) ? [...this._products.value] : [...sampleProducts];
    let filteredProducts = [...initialProducts];

    // aplicar búsqueda simple
    if (params.searchQuery) {
      const query = params.searchQuery.toLowerCase().trim();
      filteredProducts = filteredProducts.filter(product =>
        (product.name ?? '').toLowerCase().includes(query) ||
        (product.description ?? '').toLowerCase().includes(query)
      );
    }

    // Aplicar filtros si existen
    if (params.filters) {
      const { categories, minPrice, maxPrice, inStock, onSale, minRating } = params.filters;
      if (categories && categories.length > 0) {
        filteredProducts = filteredProducts.filter(product =>
          (product.category ?? []).some(cat => categories.includes(cat))
        );
      }
      if (minPrice != null) {
        filteredProducts = filteredProducts.filter(product =>
          (product.discountPrice ?? product.price) >= minPrice
        );
      }
      if (maxPrice != null && maxPrice > 0) {
        filteredProducts = filteredProducts.filter(product =>
          (product.discountPrice ?? product.price) <= maxPrice
        );
      }
      if (inStock) {
        filteredProducts = filteredProducts.filter(product => product.stock > 0);
      }
      if (onSale) {
        filteredProducts = filteredProducts.filter(product => (product.discountPercentage ?? 0) > 0);
      }
      if (minRating != null) {
        filteredProducts = filteredProducts.filter(product => (product.rating ?? 0) >= minRating);
      }
    }

    // Ordenamiento
    if (params.sortBy && params.sortBy !== 'featured') {
      filteredProducts.sort((a, b) => {
        const valA = params.sortBy === 'price' ? (a.discountPrice ?? a.price) : (a.name ?? '');
        const valB = params.sortBy === 'price' ? (b.discountPrice ?? b.price) : (b.name ?? '');

        if (valA < valB) {
          return params.sortDir === 'asc' ? -1 : 1;
        }
        if (valA > valB) {
          return params.sortDir === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    // Paginación básica
    const totalElements = filteredProducts.length;
    const page = Math.max(0, params.page ?? 0);
    const size = Math.max(1, params.size ?? totalElements);
    const start = page * size;
    const content = filteredProducts.slice(start, start + size);
    const totalPages = Math.max(1, Math.ceil(totalElements / size));

    const mock: PaginatedResponse<Product> = {
      content,
      number: page,
      size,
      totalElements,
      totalPages,
      first: page === 0,
      last: page >= totalPages - 1
    };

    return of(mock);
  }

  // Crear producto (actualiza subject)
   create(product: Product): Observable<Product> {
    if (this.http) {
      return this.http.post<Product>(this.baseUrl, product).pipe(
        tap(created => {
          const normalized = this._withAliases(this._normalizeProduct(created));
          this._products.next([normalized, ...this._products.value]);
        }),
        catchError(() => {
          const created = { ...product, id: product.id ?? String(Date.now()) };
          const normalized = this._withAliases(this._normalizeProduct(created));
          this._products.next([normalized, ...this._products.value]);
          return of(normalized);
        })
      );
    }
    const created = { ...product, id: product.id ?? String(Date.now()) };
    const normalized = this._withAliases(this._normalizeProduct(created));
    this._products.next([normalized, ...this._products.value]);
    return of(normalized);
  }

  // Actualizar producto (actualiza subject)
  update(id: string, patch: Partial<Product>): Observable<Product> {
    if (this.http) {
      return this.http.put<Product>(`${this.baseUrl}/${id}`, patch).pipe(
        tap(updated => {
          // merge con la lista actual y normalizar resultado
          const list = this._products.value.map(p => {
            if ((p.id ?? (p as any)._id) === (updated.id ?? (updated as any)._id)) {
              const merged = { ...p, ...updated };
              return this._withAliases(this._normalizeProduct(merged));
            }
            return p;
          });
          this._products.next(list);
        }),
        catchError(() => {
          const list = this._products.value.map(p => ((p.id ?? (p as any)._id) === id) ? this._withAliases(this._normalizeProduct({ ...p, ...patch })) : p);
          const updated = list.find(p => (p.id ?? (p as any)._id) === id) as Product;
          this._products.next(list);
          return of(updated);
        })
      );
    }
    const list = this._products.value.map(p => ((p.id ?? (p as any)._id) === id) ? this._withAliases(this._normalizeProduct({ ...p, ...patch })) : p);
    const updated = list.find(p => (p.id ?? (p as any)._id) === id) as Product;
    this._products.next(list);
    return of(updated);
  }

  // Eliminar producto (actualiza subject)
  delete(id: string): Observable<Product | null> {
    if (this.http) {
      return this.http.delete<Product>(`${this.baseUrl}/${id}`).pipe(
        tap(() => this._products.next(this._products.value.filter(p => (p.id ?? (p as any)._id) !== id))),
        catchError(() => {
          const removed = this._products.value.find(p => (p.id ?? (p as any)._id) === id) ?? null;
          this._products.next(this._products.value.filter(p => (p.id ?? (p as any)._id) !== id));
          return of(removed);
        })
      );
    }
    const removed = this._products.value.find(p => (p.id ?? (p as any)._id) === id) ?? null;
    this._products.next(this._products.value.filter(p => (p.id ?? (p as any)._id) !== id));
    return of(removed);
  }

  updateStock(productId: string, newStock: number): Observable<Product> {
    const url = `${this.baseUrl}/${productId}/stock`;
    return this.http.put<Product>(url, { stock: newStock });
  }
}