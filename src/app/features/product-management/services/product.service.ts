import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { PaginatedResponse, Product, ProductQueryParams, FilterState } from '../models/product.model';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProductService {
  // Configurado para conectar con Spring Boot en http://localhost:8080/productos
  private baseUrl = `${environment.apiUrl}/productos`;

  // Subject centralizado para que admin y catálogo compartan estado en tiempo real
  private readonly _products = new BehaviorSubject<Product[]>([]);
  products$ = this._products.asObservable();

  constructor(private http: HttpClient) {
    // Cargar productos al iniciar el servicio
    this.getAll().subscribe();
  }

  // Mapeo de Backend (multimedia list, calificacion number) -> Frontend (imagen string, rating object)
  private _mapToFrontend(data: any): Product {
    const img = (data.multimedia && data.multimedia.length > 0) ? data.multimedia[0] : (data.imagen || 'https://via.placeholder.com/300');
    
    // Aseguramos que categoria sea un array de strings para el frontend
    let cats: string[] = [];
    if (Array.isArray(data.categoria)) {
      cats = data.categoria;
    } else if (typeof data.categoria === 'string') {
      cats = [data.categoria];
    }

    return {
      ...data,
      id: data.id,
      // Alias para compatibilidad
      name: data.nombre,
      nombre: data.nombre,
      description: data.descripcion,
      descripcion: data.descripcion,
      price: Number(data.precio),
      precio: Number(data.precio),
      stock: Number(data.stock),
      category: cats,
      categoria: cats,
      imageUrl: img,
      imagen: img,
      // Frontend espera objeto rating { rate, count }
      rating: { rate: data.calificacion || 0, count: 0 }
    } as unknown as Product;
  }

  // Mapeo de Frontend -> Backend
  private _mapToBackend(product: any): any {
    // Extraer la primera categoría si es un array, o usar string directo
    let cat = 'General';
    if (Array.isArray(product.categoria) && product.categoria.length > 0) {
      cat = product.categoria[0];
    } else if (typeof product.categoria === 'string') {
      cat = product.categoria;
    } else if (Array.isArray(product.category) && product.category.length > 0) {
      cat = product.category[0];
    }

    const img = product.imagen || product.imageUrl || product.image || '';

    return {
      id: product.id,
      nombre: product.nombre || product.name,
      descripcion: product.descripcion || product.description,
      precio: product.precio || product.price,
      stock: product.stock,
      categoria: cat,
      // Convertimos la imagen simple a lista multimedia
      multimedia: img ? [img] : [],
      // Campos requeridos por el backend
      marca: product.marca || 'Generica',
      disponibilidad: product.disponibilidad ?? true,
      garantia: product.garantia || '1 año',
      calificacion: product.rating?.rate || 0
    };
  }

  // Devuelve observable con lista completa (no paginada)
  getAll(): Observable<Product[]> {
    // Fix: Usar endpoint REST estándar (GET /productos) en lugar de /get/product
    return this.http.get<any>(this.baseUrl).pipe(
      map(response => {
        // Adaptador inteligente: Si el backend devuelve un Page (objeto), extraemos content. Si es Array, lo usamos directo.
        const items = Array.isArray(response) ? response : (response.content || []);
        return items.map((item: any) => this._mapToFrontend(item));
      }),
      tap(products => this._products.next(products)),
      catchError(error => {
        console.error('Error cargando productos (getAll). Verifique CORS en Backend o URL correcta.', error);
        return of([]);
      })
    );
  }

  // Inicializar/sembrar datos en el BehaviorSubject (útil para entorno sin backend)
  loadInitial(products: Product[]) {
    this._products.next(products);
  }

  // Método existente para paginado/simulación; ahora usa el state central si existe
  getProducts(params: ProductQueryParams & { filters?: FilterState }): Observable<PaginatedResponse<Product>> {
    // Si hay búsqueda por texto, usamos el endpoint de búsqueda (que devuelve lista, no página)
    if (params.searchQuery && params.searchQuery.trim().length > 0) {
      const q = params.searchQuery.trim();
      return this.http.get<any[]>(`${this.baseUrl}/search`, { params: { q } }).pipe(
        map(items => {
          const products = items.map(item => this._mapToFrontend(item));
          // Simulamos estructura paginada
          return {
            content: products,
            totalPages: 1,
            totalElements: products.length,
            size: products.length,
            number: 0,
            first: true,
            last: true
          };
        }),
        catchError(() => of({
          content: [], totalPages: 0, totalElements: 0, size: 0, number: 0, first: true, last: true
        }))
      );
    }

    // Si no hay búsqueda, usamos paginación normal
    let httpParams = new HttpParams()
      .set('page', params.page.toString())
      .set('size', params.size.toString())
      .set('sortBy', params.sortBy)
      .set('sortDir', params.sortDir);

    // Fix: Acceso seguro a filters y category usando 'any' temporalmente si la interfaz no coincide,
    // o validando existencia.
    if (params.filters && (params.filters as any).category) {
        const rawCat = (params.filters as any).category;
        // Fix: Convertir array a string o tomar el primer valor, ya que el backend espera un String
        const cat = Array.isArray(rawCat) 
          ? (rawCat.length > 0 ? rawCat[0] : '') 
          : rawCat;
        
        if (cat) {
          httpParams = httpParams.set('categoria', String(cat));
        }
    }
    
    // No usamos 'q' aquí porque ya se manejó arriba en el bloque if

    // Fix: Usar endpoint base (GET /productos) con params.
    // IMPORTANTE: Si ves errores CORS en consola, debes agregar @CrossOrigin(origins = "http://localhost:4200") en tu Controller de Spring Boot.
    return this.http.get<any>(this.baseUrl, { params: httpParams }).pipe(
      map(response => {
        // Lógica robusta: El backend puede devolver una lista simple (Array) o una Page (Objeto con content)
        let content = [];
        let totalElements = 0;
        let totalPages = 1;

        if (Array.isArray(response)) {
            // Caso: Backend devuelve lista completa sin paginar
            content = response.map((p: any) => this._mapToFrontend(p));
            totalElements = content.length;
        } else if (response && response.content) {
            // Caso: Backend devuelve objeto Page estándar de Spring
            content = response.content.map((p: any) => this._mapToFrontend(p));
            totalElements = response.totalElements;
            totalPages = response.totalPages;
        }

        return {
          content: content,
          totalPages: totalPages,
          totalElements: totalElements,
          size: response.size || params.size,
          number: response.number || params.page,
          first: response.first ?? true,
          last: response.last ?? true
        };
      }),
      catchError((err) => {
          console.error('Error en getProducts. Revise consola por errores CORS (bloqueo de seguridad) o 404 (URL incorrecta).', err);
          return of({
              content: [],
              totalPages: 0,
              totalElements: 0,
              size: params.size,
              number: params.page,
              first: true,
              last: true,
          });
      })
    );
  }

  // Crear producto (actualiza subject)
   create(product: Product): Observable<any> {
    const payload = this._mapToBackend(product);
    // Fix: Usar POST /productos y esperar JSON estándar
    return this.http.post<any>(this.baseUrl, payload).pipe(
      map(response => {
          // Si el backend devuelve el objeto creado, tomamos su ID
          const id = response?.id || response;
          return { ...this._mapToFrontend(payload), id };
      }),
      tap(() => this.getAll().subscribe()), // Recargar lista completa para actualizar UI
      catchError(err => {
        console.error('Error creando producto', err);
        return of(null);
      })
    );
  }

  // Actualizar producto (actualiza subject)
  update(id: string, patch: Partial<Product>): Observable<any> {
    // Backend espera el objeto completo con ID en el body para /editarProducto
    // Fix: Comparación de ID robusta (String vs String)
    const current = this._products.value.find(p => String(p.id) === String(id)) || {};
    const merged = { ...current, ...patch, id };
    const payload = this._mapToBackend(merged);

    // Fix: Usar PUT /productos/:id en lugar de /editarProducto
    return this.http.put(`${this.baseUrl}/${id}`, payload).pipe(
      map(res => this._mapToFrontend(res)),
      tap(() => this.getAll().subscribe()),
      catchError(err => {
        console.error('Error actualizando producto', err);
        return of(null);
      })
    );
  }

  // Eliminar producto (actualiza subject)
  delete(id: string): Observable<any> {
    // Fix: Asegurar que la URL es correcta (ya estaba bien, pero confirmamos)
    return this.http.delete(`${this.baseUrl}/${id}`).pipe(
      tap(() => this.getAll().subscribe()),
      catchError(err => {
        console.error('Error eliminando producto', err);
        return of(null);
      })
    );
  }

  updateStock(productId: string, newStock: number): Observable<any> {
    // Fix: Comparación de ID robusta
    const current = this._products.value.find(p => String(p.id) === String(productId));
    if (!current) return of(null);
    
    const payload = this._mapToBackend({ ...current, stock: newStock });
    // Fix: Usar PUT /productos/:id
    return this.http.put(`${this.baseUrl}/${productId}`, payload).pipe(
        tap(() => this.getAll().subscribe())
    );
  }
}