import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { PaginatedResponse, Product, ProductQueryParams, FilterState } from '../models/product.model';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private baseUrl = `${environment.apiUrl}/products`;

  // Subject centralizado para que admin y catálogo compartan estado en tiempo real
  private readonly _products = new BehaviorSubject<Product[]>([]);
  products$ = this._products.asObservable();

  constructor(private http: HttpClient) {
    // El constructor ahora está limpio y no carga datos de ejemplo.
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

   private _normalizeProduct(p: any): Product {
    const id = p.id ?? p._id ?? String(Date.now());
    const name = (p.name ?? p.nombre ?? '').toString();
    const price = (p.price ?? p.precio ?? 0) as number;
    const description = (p.description ?? p.descripcion ?? '').toString();
    const stock = (p.stock ?? 0) as number;
    const category = (p.category ?? p.categoria ?? []) as string[];
    const rating = (p.rating ?? 0) as number;

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

    // 🚨 CORRECCIÓN: Añadir los filtros a los HttpParams
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          httpParams = httpParams.set(key, String(value));
        }
      });
    }

    // La lógica de filtrado, ordenamiento y paginación ahora se delega al backend.
    // El frontend solo envía los parámetros.
    return this.http.get<PaginatedResponse<Product>>(this.baseUrl, { params: httpParams }).pipe(
      catchError(() => {
        // En caso de error en la API, devolvemos una respuesta vacía para no romper la UI
        const emptyResponse: PaginatedResponse<Product> = {
          content: [],
          totalPages: 0,
          totalElements: 0,
          size: params.size,
          number: params.page,
          first: true,
          last: true,
        };
        return of(emptyResponse);
      })
    );
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
    const numericId = parseInt(id, 10);
    if (this.http) {
      return this.http.put<Product>(`${this.baseUrl}/${id}`, patch).pipe(
        tap(updated => {
          // merge con la lista actual y normalizar resultado
          const list = this._products.value.map(p => {
            if (p.id === updated.id) {
              const merged = { ...p, ...updated };
              return this._withAliases(this._normalizeProduct(merged));
            }
            return p;
          });
          this._products.next(list);
        }),
        catchError(() => {
          const list = this._products.value.map(p => (p.id === numericId) ? this._withAliases(this._normalizeProduct({ ...p, ...patch })) : p);
          const updated = list.find(p => p.id === numericId) as Product;
          this._products.next(list);
          return of(updated);
        })
      );
    }
    const list = this._products.value.map(p => (p.id === numericId) ? this._withAliases(this._normalizeProduct({ ...p, ...patch })) : p);
    const updated = list.find(p => p.id === numericId) as Product;
    this._products.next(list);
    return of(updated);
  }

  // Eliminar producto (actualiza subject)
  delete(id: string): Observable<Product | null> {
    const numericId = parseInt(id, 10);
    if (this.http) {
      return this.http.delete<Product>(`${this.baseUrl}/${id}`).pipe(
        tap(() => this._products.next(this._products.value.filter(p => p.id !== numericId))),
        catchError(() => {
          const removed = this._products.value.find(p => p.id === numericId) ?? null;
          this._products.next(this._products.value.filter(p => p.id !== numericId));
          return of(removed);
        })
      );
    }
    const removed = this._products.value.find(p => p.id === numericId) ?? null;
    this._products.next(this._products.value.filter(p => p.id !== numericId));
    return of(removed);
  }

  updateStock(productId: string, newStock: number): Observable<Product> {
    const url = `${this.baseUrl}/${productId}/stock`;
    return this.http.put<Product>(url, { stock: newStock }).pipe(
      tap(updatedProduct => {
        // Normaliza la respuesta del backend para asegurar consistencia
        const normalizedProduct = this._normalizeProduct(updatedProduct);

        // Actualiza la lista de productos en el BehaviorSubject
        const currentProducts = this._products.getValue();
        const index = currentProducts.findIndex(p => p.id === Number(productId));
        if (index !== -1) {
          currentProducts[index] = this._withAliases(normalizedProduct);
          this._products.next([...currentProducts]);
        }
      })
    );
  }
}