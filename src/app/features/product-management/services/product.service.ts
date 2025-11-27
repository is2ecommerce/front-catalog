import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { PaginatedResponse, Product, ProductQueryParams, FilterState } from '../models/product.model';
import { environment } from '../../../../environments/environment';

// NOTA: Si ves errores en los imports de @angular, ejecuta 'npm install' en la terminal.
@Injectable({ providedIn: 'root' })
export class ProductService {
  private baseUrl = `${environment.apiUrl}/productos`;

  private readonly _products = new BehaviorSubject<Product[]>([]);
  products$ = this._products.asObservable();

  // Categorías base del backend
  private readonly baseCategories = ["Tecnología", "Audio", "Hogar", "Oficina", "Fotografía"];

  categories$ = this.products$.pipe(
    map(products => {
      const categoryMap = new Map<string, number>();
      this.baseCategories.forEach(c => categoryMap.set(c, 0));

      products.forEach(p => {
        (p.category || []).forEach(c => {
          // normalizar acentos/mayúsculas
          const norm = c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const baseMatch = this.baseCategories.find(
            bc => bc.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === norm
          );
          const key = baseMatch || c;
          categoryMap.set(key, (categoryMap.get(key) || 0) + 1);
        });
      });

      return Array.from(categoryMap.entries())
        .filter(([_, count]) => count >= 0)
        .map(([name, count]) => ({ name, count }));
    })
  );

  constructor(private http: HttpClient) {
    this.getAll().subscribe();
  }

  private _normalizeProduct(p: any): Product {
    if (!p) return {} as Product;

    const id = p.id ?? p._id ?? String(Date.now());
    const name = (p.nombre ?? p.name ?? '').toString();
    const price = (p.precio ?? p.price ?? 0) as number;
    const description = (p.descripcion ?? p.description ?? '').toString();
    const stock = (p.stock ?? 0) as number;
    
    // categorías: garantizar array y mapear a base cuando coincida
    let category: string[] = [];
    if (p.categoria) {
      category = Array.isArray(p.categoria) ? p.categoria : [String(p.categoria)];
    } else if (p.category) {
      category = Array.isArray(p.category) ? p.category : [String(p.category)];
    }
    category = category.map(c => {
      const norm = c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const baseMatch = this.baseCategories.find(
        bc => bc.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === norm
      );
      return baseMatch || c;
    });

    // imagen: soportar multimedia/imagen y rutas relativas
    let imageUrl = '';
    if (p.multimedia && Array.isArray(p.multimedia) && p.multimedia.length > 0) {
      imageUrl = p.multimedia[0];
    } else {
      imageUrl = p.imagen ?? p.imageUrl ?? '';
    }
    if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
      const cleanPath = imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl;
      imageUrl = cleanPath.startsWith('assets/') ? cleanPath : `assets/${cleanPath}`;
    }
    if (!imageUrl) {
      imageUrl = 'https://via.placeholder.com/300x200?text=Sin+Imagen';
    }

    const ratingVal = p.calificacion ?? (typeof p.rating === 'number' ? p.rating : p.rating?.rate) ?? 0;
    const ratingObj = { rate: ratingVal, count: 0 };

    const normalized = {
      id: p.id ?? p._id ?? String(Date.now()),
      name: (p.nombre ?? p.name ?? '').toString(),
      price: Number(p.precio ?? p.price ?? 0),
      description: (p.descripcion ?? p.description ?? '').toString(),
      stock: Number(p.stock ?? 0),
      category,
      image: imageUrl,          // CLAVE: el card usa 'image'
      imageUrl,                 // compatibilidad interna
      rating: ratingObj
    } as Product;

    // Aliases para compatibilidad con templates
    (normalized as any).nombre = name;
    (normalized as any).descripcion = description;
    (normalized as any).precio = price;
    (normalized as any).imagen = imageUrl;

    // Fix: 'as unknown as Product' silencia errores de tipado estricto si faltan propiedades opcionales
    return normalized;
  }

  private _mapToBackend(p: Partial<Product>): any {
    const payload: any = {};
    if (p.id) payload.id = p.id;
    payload.nombre = (p as any).name ?? (p as any).nombre;
    payload.descripcion = (p as any).description ?? (p as any).descripcion;
    payload.precio = (p as any).price ?? (p as any).precio;
    payload.stock = p.stock;
    
    const cats = (p as any).category ?? (p as any).categoria;
    if (cats && Array.isArray(cats) && cats.length > 0) payload.categoria = cats[0];
    else if (typeof cats === 'string') payload.categoria = cats;
    
    const img = (p as any).imageUrl ?? (p as any).imagen ?? (p as any).image;
    if (img) payload.multimedia = [img];

    return payload;
  }

  getAll(): Observable<Product[]> {
    return this.http.get<any[]>(this.baseUrl).pipe(
      map(response => {
        const items = Array.isArray(response) ? response : [];
        return items.map(p => this._normalizeProduct(p));
      }),
      tap(products => this._products.next(products)),
      catchError(err => {
        console.error('Error en getAll:', err);
        return of([]);
      })
    );
  }

  getProducts(params: ProductQueryParams & { filters?: FilterState }): Observable<PaginatedResponse<Product>> {
    
    // 1. BÚSQUEDA
    if (params.searchQuery && params.searchQuery.trim().length > 0) {
      return this.http.get<any[]>(`${this.baseUrl}/search`, { 
        params: { q: params.searchQuery } 
      }).pipe(
        map(list => this._wrapListAsPage(list, params)),
        catchError(() => of(this._emptyPage(params)))
      );
    }

    // 2. FILTROS
    const filters = params.filters as any;
    const hasCategory = filters?.categories && filters.categories.length > 0;
    const hasPrice = (filters?.minPrice != null) || (filters?.maxPrice != null);
    const hasStock = filters?.inStock === true;
    const hasRating = filters?.minRating != null && filters.minRating > 0;

    if (hasCategory || hasPrice || hasStock || hasRating) {
      let filterParams = new HttpParams();
      if (filters.minPrice != null) filterParams = filterParams.set('precio_min', String(filters.minPrice));
      if (filters.maxPrice != null) filterParams = filterParams.set('precio_max', String(filters.maxPrice));
      if (filters.inStock) {
        filterParams = filterParams.set('disponibilidad', 'true');
        filterParams = filterParams.set('stock_min', '1');
      }
      if (filters.minRating != null) {
        filterParams = filterParams.set('calificacion_min', String(filters.minRating));
      }
      if (hasCategory) {
        // enviar solo la primera categoría seleccionada, en formato exacto
        filterParams = filterParams.set('categoria', filters.categories[0]);
      }

      console.log('DEBUG: Enviando filtros al backend:', filterParams.toString());

      return this.http.get<any[]>(`${this.baseUrl}/filter`, { params: filterParams }).pipe(
        map(list => this._wrapListAsPage(list, params)),
        catchError(err => {
          console.error('Error en filtros:', err);
          return of(this._emptyPage(params));
        })
      );
    }

    // 3. PAGINACIÓN (Sin filtros)
    let httpParams = new HttpParams()
      .set('page', params.page.toString())
      .set('size', params.size.toString())
      .set('sortBy', params.sortBy || 'nombre')
      .set('sortDir', params.sortDir || 'asc');

    return this.http.get<any>(this.baseUrl, { params: httpParams }).pipe(
      map(response => {
        if (!response) return this._emptyPage(params);

        const content = (response.content || []).map((p: any) => this._normalizeProduct(p));
        return {
          content: content,
          totalPages: response.totalPages || 0,
          totalElements: response.totalElements || 0,
          size: response.size || params.size,
          number: response.number || params.page,
          first: response.first ?? true,
          last: response.last ?? true
        };
      }),
      catchError(err => {
        console.error('Error cargando productos paginados:', err);
        return of(this._emptyPage(params));
      })
    );
  }

  create(product: Product): Observable<Product> {
    const payload = this._mapToBackend(product);
    return this.http.post<any>(this.baseUrl, payload).pipe(
      tap(() => this.getAll().subscribe()),
      map(created => this._normalizeProduct(created)),
      catchError(err => {
        console.error('Error creando producto:', err);
        throw err;
      })
    );
  }

  update(id: string, patch: Partial<Product>): Observable<Product> {
    const payload = this._mapToBackend(patch);
    return this.http.put<any>(`${this.baseUrl}/${id}`, payload).pipe(
      tap(() => this.getAll().subscribe()),
      map(updated => this._normalizeProduct(updated)),
      catchError(err => {
        console.error('Error actualizando producto:', err);
        throw err;
      })
    );
  }

  delete(id: string): Observable<Product | null> {
    return this.http.delete<any>(`${this.baseUrl}/${id}`).pipe(
      tap(() => this.getAll().subscribe()),
      map(() => null),
      catchError(err => {
        console.error('Error eliminando producto:', err);
        return of(null);
      })
    );
  }

  updateStock(productId: string, newStock: number): Observable<Product> {
    return this.update(productId, { stock: newStock } as any);
  }

  private _wrapListAsPage(list: any[], params: any): PaginatedResponse<Product> {
      const products = (list || []).map(p => this._normalizeProduct(p));
      return {
          content: products,
          totalPages: 1,
          totalElements: products.length,
          size: products.length,
          number: 0,
          first: true,
          last: true
      };
  }

  private _emptyPage(params: any): PaginatedResponse<Product> {
      return {
          content: [], totalPages: 0, totalElements: 0,
          size: params.size, number: params.page, first: true, last: true
      };
  }
  
  loadInitial(products: Product[]) {
      this._products.next(products);
  }
}