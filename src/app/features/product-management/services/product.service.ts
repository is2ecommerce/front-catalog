import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { PaginatedResponse, Product, ProductQueryParams, FilterState } from '../models/product.model';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private baseUrl = `${environment.apiUrl}`;
  // Mapa de nombres exactos -> URL de imagen (fallback mientras backend no envíe multimedia)
  private readonly nameToImage: Record<string, string> = {
    "Monitor Curvo 32''": 'https://dasmitec.pe/wp-content/uploads/2025/06/G34WQi.1.jpg-600x600.jpg',
    'Horno Microondas 30L': 'https://www.lg.com/content/dam/channel/wcms/co/images/microondas/mh7032jas_bbkelat_escb_co_c/gallery/D01.jpg',
    'Parlante Bluetooth MaxSound': 'https://m.media-amazon.com/images/I/71vW6O5jfiL._AC_UF894,1000_QL80_.jpg',
    'Mouse Gamer UltraLight': 'https://m.media-amazon.com/images/I/71P9YFNyBeS._AC_UF1000,1000_QL80_.jpg',
    'Teclado Mecánico RGB': 'https://expocolsuministros.com/wp-content/uploads/2024/10/Teclado-Mecanico-Redragon-Kumara-K55-RGB.jpg',
    'Silla Ergonómica ProOffice': 'https://png.pngtree.com/png-clipart/20250507/original/pngtree-navy-blue-ergonomic-office-chair-png-image_20943390.png',
    "Televisor 55'' 4K Ultra HD": 'https://challengerco.vteximg.com.br/arquivos/ids/165673-500-500/7705191044743_1.jpg?v=638687424594300000',
    'Cámara Reflex ProShot 2500': 'https://www.canon.com.mx/datacenter/image/resize-center/328x328/imagenesproducto/fichero/3512_EOS_6D_Mark_II_01.jpg/',
    'Laptop Gamer Titan X15': 'https://p2ofp.static.pub//fes/cms/2024/07/17/109vq5fdalv01w5jsu6vh35ncnk5jn890135.png',
    'Audífonos BassPro': 'https://acdn-us.mitiendanube.com/stores/093/864/products/eb-tws-400-negro-5468264e3018f3daa417235015450851-640-0.webp',
    'Impresora Multifuncional JetPrint': 'https://w7.pngwing.com/pngs/569/509/png-transparent-hewlett-packard-hp-laserjet-pro-m177-laser-printing-multi-function-printer-hewlett-packard-angle-electronic-device-multifunction-printer.png',
    'Tablet ProTab 11': 'https://p2ofp.static.pub//fes/cms/2024/05/24/doc9jf4r5flvovqubuove46b9e34k3966573.png',
    'Aspiradora Robot CleanMate 3': 'https://tiendakarcher.com/wp-content/uploads/1269620_hero_02-web_1200_max_qd-ef19a594-99af-45ad-a8da-cf66adf75bb3.jpg',
    'Cafetera Espresso MasterBrew': 'https://img.freepik.com/vector-gratis/composicion-realista-maquina-cafe-elegante-modelo-rojo-preparar-bebidas-calientes-taza-ilustracion-vectorial-reflexion_1284-68520.jpg?semt=ais_hybrid&w=740&q=80'
  };

  // Subject centralizado para que admin y catálogo compartan estado en tiempo real
  private readonly _products = new BehaviorSubject<Product[]>([]);
  products$ = this._products.asObservable();

  constructor(private http: HttpClient) {
    // Cargar productos iniciales para que getAll() tenga datos
    this.loadInitialProducts();
  }

private _withAliases(p: Product): Product {
    return {
      ...p,
      nombre: (p as any).name ?? (p as any).nombre,
      descripcion: (p as any).description ?? (p as any).descripcion,
      precio: (p as any).price ?? (p as any).precio,
      imagen: (p as any).image ?? (p as any).imagen
    } as Product & any;
  }

   private _normalizeProduct(p: any): Product {
    const id = p.id ?? p._id ?? String(Date.now());
    const name = (p.name ?? p.nombre ?? '').toString();
    const price = (p.price ?? p.precio ?? 0) as number;
    const description = (p.description ?? p.descripcion ?? '').toString();
    const stock = (p.stock ?? 0) as number;
    
    // Normalizar categoría: el backend envía string, el frontend espera array
    let category: string[];
    const rawCategory = p.category ?? p.categoria;
    if (Array.isArray(rawCategory)) {
      category = rawCategory;
    } else if (typeof rawCategory === 'string') {
      category = [rawCategory];
    } else {
      category = [];
    }
    
    // Normalizar rating: backend envía calificacion (number), frontend espera rating.rate
    let rating: { rate: number; count: number } | undefined;
    if (p.rating && typeof p.rating === 'object' && 'rate' in p.rating) {
      rating = p.rating;
    } else if (p.calificacion !== undefined) {
      rating = { rate: p.calificacion, count: p.comentarios?.length ?? 0 };
    } else {
      rating = undefined;
    }

    // Normalizar la imagen: aceptar URLs en p.multimedia (array de strings) y campos conocidos
      let rawImage = p.image ?? p.imagen ?? p.imageUrl ?? p.url ?? '';
      if ((!rawImage || typeof rawImage !== 'string' || rawImage.trim() === '') && Array.isArray(p.multimedia) && p.multimedia.length > 0) {
        const first = p.multimedia[0];
        rawImage = typeof first === 'string' ? first : '';
      }
      let image = '';

    if (rawImage instanceof File) {
      image = URL.createObjectURL(rawImage);
    } else if (typeof rawImage === 'string') {
      image = rawImage.trim();
      // Aceptar solo URLs http/https o data URIs; si no, considerar vacío
      const isHttp = image.startsWith('http://') || image.startsWith('https://');
      const isData = image.startsWith('data:image/');
      if (!isHttp && !isData) {
        image = '';
      }
    } else {
      image = '';
    }

    // Si no hay imagen aún, intentar por nombre con el mapa proporcionado
    if (!image) {
      const lookupName = name || (p.nombre ?? '').toString();
      if (lookupName && this.nameToImage[lookupName]) {
        image = this.nameToImage[lookupName];
      }
    }

    // Placeholder determinista si no hay imagen
    if (!image) {
      const seedBase = (id || name || description || 'producto').toString().replace(/\s+/g, '-');
      image = `https://picsum.photos/seed/${encodeURIComponent(seedBase)}/600/400`;
    }

    const normalized: Product = {
      id,
      name,
      price,
      description,
      image,
      stock,
      category,
      rating,
    } as Product;

    // añadir aliases para compatibilidad con templates en español
    (normalized as any).nombre = name;
    (normalized as any).descripcion = description;
    (normalized as any).precio = price;
    (normalized as any).imagen = image;

    return normalized;
  }


  

  // Devuelve observable con lista completa (no paginada)
  getAll(): Observable<Product[]> {
    return this.products$;
  }

  // Cargar todos los productos del backend para inicializar el BehaviorSubject
  loadInitialProducts(): void {
    if (this.http) {
      this.http.get<any[]>(`${this.baseUrl}/get/product`).pipe(
        map(products => products.map(p => this._withAliases(this._normalizeProduct(p)))),
        catchError(() => of([]))
      ).subscribe(products => {
        this._products.next(products);
      });
    }
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
    return this.http.get<PaginatedResponse<any>>(`${this.baseUrl}/paginated`, { params: httpParams }).pipe(
      map(response => {
        let content = response.content.map(p => this._withAliases(this._normalizeProduct(p)));

        // Filtro por texto (searchQuery) en cliente
        const q = (params.searchQuery || '').trim().toLowerCase();
        if (q) {
          content = content.filter(item => {
            const haystack = [
              item.name,
              (item as any).nombre,
              item.description,
              (item as any).descripcion,
              ...(Array.isArray(item.category) ? item.category : [])
            ].filter(Boolean).join(' ').toLowerCase();
            return haystack.includes(q);
          });
        }

        // Aplicar filtros en el cliente si el backend aún no los soporta
        const f = params.filters;
        if (f) {
          content = content.filter(item => {
            const inCategories = !f.categories?.length || (item.category || []).some((c: string) => f.categories!.includes(c));
            const inMinPrice = f.minPrice ? item.price >= f.minPrice : true;
            const inMaxPrice = f.maxPrice ? item.price <= f.maxPrice : true;
            const inStock = f.inStock ? (item.stock ?? 0) > 0 : true;
            const onSale = f.onSale ? (item.discount ?? 0) > 0 : true;
            const minRating = f.minRating ? ((item.rating?.rate ?? 0) >= f.minRating) : true;
            return inCategories && inMinPrice && inMaxPrice && inStock && onSale && minRating;
          });
        }

        return {
          ...response,
          content
        } as PaginatedResponse<Product>;
      }),
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
      return this.http.post<Product>(`${this.baseUrl}/create`, product).pipe(
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
      return this.http.put<Product>(`${this.baseUrl}/editarProducto`, { id, ...patch }).pipe(
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
    const url = `${this.baseUrl}/${productId}/sumar-stock`;
    return this.http.put<Product>(url, { cantidad: newStock }).pipe(
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