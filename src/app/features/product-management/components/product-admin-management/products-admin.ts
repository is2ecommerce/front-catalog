import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductFormComponent } from '../product-form/product-form.component';
import { ProductService } from '../../services/product.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-products-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, ProductFormComponent],
  templateUrl: './products-admin.html',
  styleUrls: ['./products-admin.scss']
})
export class ProductsAdminComponent implements OnInit {
  productos: any[] = [];
  private _subs: Subscription[] = [];

  viewMode: 'grid' | 'list' = 'grid';
  sortOption = 'price-asc';

  showEditModal = false;
  showDeleteModal = false;
  showChangeLogModal = false; 
  selectedProduct: any = null;

  changeLogEntries: any[] = [];
  private _localChangeLog: any[] = [];

  constructor(private productService: ProductService) {}

  ngOnInit(): void {
    // subscribir al flujo central de productos
    this._subs.push(
      this.productService.getAll().subscribe(list => {
        this.productos = list ?? [];
        // mantener orden si hay opción seleccionada
        this.sortProducts();
      })
    );

    // seed inicial si vacío
    if ((this.productos?.length ?? 0) === 0) {
      this.productService.loadInitial(this.sampleProducts());
    }
  }

  ngOnDestroy(): void {
    this._subs.forEach(s => s.unsubscribe());
  }

  openChangeLog() {
    this.showChangeLogModal = true;
    this.loadChangeLog();
  }

  closeChangeLog() {
    this.showChangeLogModal = false;
  }

  private loadChangeLog() {
    // Si el servicio provee un método getChangeLog use ese; si no, usar sample.
    if (this.productService && typeof (this.productService as any).getChangeLog === 'function') {
      (this.productService as any).getChangeLog().subscribe((res: any[]) => {
         this.changeLogEntries = [...this._localChangeLog, ...(res ?? [])].slice(0, 200);
      }, () => {
        this.changeLogEntries = [...this._localChangeLog, ...this.sampleChangeLog()].slice(0, 200);
      });
    } else {
      this.changeLogEntries = [...this._localChangeLog, ...this.sampleChangeLog()].slice(0, 200);
    }
  }

  private sampleChangeLog(): any[] {
    return [
      { action: 'Creado', user: 'admin', date: new Date(Date.now() - 1000 * 60 * 60 * 24), message: 'Producto "Camiseta" creado.' },
      { action: 'Actualizado', user: 'maria', date: new Date(Date.now() - 1000 * 60 * 60 * 2), message: 'Precio actualizado.' },
      { action: 'Eliminado', user: 'admin', date: new Date(Date.now() - 1000 * 60 * 30), message: 'Producto "Taza" eliminado.' }
    ];
  }

  private addChangeLogEntry(action: string, message: string, user = 'admin', details?: any[]) {
    const entry = { action, user, date: new Date(), message, details };
    this._localChangeLog = [entry, ...(this._localChangeLog ?? [])].slice(0, 200);
    this.changeLogEntries = [entry, ...(this.changeLogEntries ?? [])].slice(0, 200);
  }

  private computeDiff(original: any, updated: any) {
    if (!original) return [];
    const fields = ['nombre', 'descripcion', 'precio', 'stock', 'categoria', 'imagen'];
    const diffs: Array<{ field: string; from: any; to: any }> = [];

    for (const f of fields) {
      const from = original[f] ?? original[f === 'nombre' ? 'name' : f];
      const to = updated[f] ?? updated[f === 'nombre' ? 'name' : f];

      // normalizar arrays a string para comparación legible
      const norm = (v: any) => (Array.isArray(v) ? v.join(', ') : (v === null || v === undefined) ? '' : String(v));
      if (norm(from) !== norm(to)) {
        diffs.push({ field: f, from: norm(from), to: norm(to) });
      }
    }

    return diffs;
  }

  loadProducts(): void {
    if (this.productService && typeof (this.productService as any).getAll === 'function') {
      (this.productService as any).getAll().subscribe((res: any[]) => {
        this.productos = res ?? [];
      }, () => {
        this.productos = this.sampleProducts();
      });
    } else {
      this.productos = this.sampleProducts();
    }
  }

  private sampleProducts(): any[] {
    return [
      { id: '1', nombre: 'Camiseta', descripcion: 'Camiseta de algodón', precio: 1999, stock: 10, categoria: ['Ropa'], imagen: 'https://via.placeholder.com/300x200' },
      { id: '2', nombre: 'Taza', descripcion: 'Taza cerámica', precio: 799, stock: 25, categoria: ['Hogar'], imagen: 'https://via.placeholder.com/300x200' }
    ];
  }

  setView(mode: 'grid' | 'list') {
    this.viewMode = mode;
  }

  sortProducts() {
    const opt = this.sortOption;
    this.productos.sort((a, b) => {
      if (opt === 'price-asc') return (a.precio ?? a.price) - (b.precio ?? b.price);
      if (opt === 'price-desc') return (b.precio ?? b.price) - (a.precio ?? a.price);
      const nameA = (a.nombre ?? a.name ?? '').toLowerCase();
      const nameB = (b.nombre ?? b.name ?? '').toLowerCase();
      if (opt === 'name-asc') return nameA.localeCompare(nameB);
      if (opt === 'name-desc') return nameB.localeCompare(nameA);
      return 0;
    });
  }

  verDetalle(product: any) {
    // implementar si se desea ver detalle
  }

  openCreate() {
    this.selectedProduct = null;
    this.showEditModal = true;
  }

  openEdit(product: any) {
    this.selectedProduct = { ...product };
    this.showEditModal = true;
  }

  closeEdit() {
    this.showEditModal = false;
    this.selectedProduct = null;
  }

  onProductSaved(updated: any) {
    const idCandidate = updated.id ?? updated._id ?? this.selectedProduct?.id ?? this.selectedProduct?._id;

    // Si existe id -> actualizar; si no -> crear a través del servicio.
    if (idCandidate && typeof (this.productService as any).update === 'function') {
      // conservar copia original para diff
      const originalIdx = this.productos.findIndex(p => (p.id ?? p._id) === idCandidate);
      const original = originalIdx > -1 ? { ...this.productos[originalIdx] } : null;

      (this.productService as any).update(idCandidate, updated).subscribe((res: any) => {
        const merged = original ? { ...original, ...res } : res;
        const details = this.computeDiff(original, merged);
        const name = merged.nombre ?? merged.name ?? 'Producto';
        if (details.length) {
          this.addChangeLogEntry('Actualizado', `Producto "${name}" actualizado.`, 'admin', details);
        } else {
          this.addChangeLogEntry('Actualizado', `Producto "${name}" actualizado (sin cambios detectados).`, 'admin');
        }
        this.closeEdit();
      }, () => {
        // fallback local: aplicar cambios y propagar al service
        if (originalIdx > -1) {
          this.productos[originalIdx] = { ...original, ...updated };
        } else {
          if (!(updated.id ?? updated._id)) updated.id = String(Date.now());
          this.productos.unshift(updated);
        }
        // propagar al subject del service para sincronizar otras vistas
        if (typeof (this.productService as any).loadInitial === 'function') {
          (this.productService as any).loadInitial(this.productos);
        }
        const merged = original ? { ...original, ...updated } : updated;
        const details = this.computeDiff(original, merged);
        this.addChangeLogEntry('Actualizado', `Producto "${merged.nombre ?? merged.name}" actualizado (local).`, 'admin', details);
        this.closeEdit();
      });
      return;
    }

    // Crear
    if (typeof (this.productService as any).create === 'function') {
      (this.productService as any).create(updated).subscribe((res: any) => {
        const created = res ?? updated;
        this.addChangeLogEntry('Creado', `Producto "${created.nombre ?? created.name}" creado.`, 'admin');
        this.closeEdit();
      }, () => {
        // fallback local
        if (!(updated.id ?? updated._id)) updated.id = String(Date.now());
        this.productos.unshift(updated);
        if (typeof (this.productService as any).loadInitial === 'function') {
          (this.productService as any).loadInitial(this.productos);
        }
        this.addChangeLogEntry('Creado', `Producto "${updated.nombre ?? updated.name}" creado (local).`, 'admin');
        this.closeEdit();
      });
      return;
    }

    // Sin service: aplicar localmente
    let idx = -1;
    if (idCandidate) {
      idx = this.productos.findIndex(p => (p.id ?? p._id) === idCandidate);
    }
    if (idx === -1) {
      idx = this.productos.findIndex(p =>
        (p.nombre ?? p.name ?? '').toString() === (updated.nombre ?? updated.name ?? '').toString()
        && (p.precio ?? p.price ?? '').toString() === (updated.precio ?? updated.price ?? '').toString()
      );
    }

    const name = updated.nombre ?? updated.name ?? 'Producto';
    if (idx > -1) {
      const original = { ...this.productos[idx] };
      const merged = { ...original, ...updated };
      this.productos[idx] = merged;
      const details = this.computeDiff(original, merged);
      this.addChangeLogEntry('Actualizado', `Producto "${name}" actualizado (local).`, 'admin', details);
    } else {
      if (!(updated.id ?? updated._id)) updated.id = String(Date.now());
      this.productos.unshift(updated);
      this.addChangeLogEntry('Creado', `Producto "${name}" creado (local).`, 'admin');
    }
    // propagar al service si posible
    if (typeof (this.productService as any).loadInitial === 'function') {
      (this.productService as any).loadInitial(this.productos);
    }
    this.sortProducts();
    this.closeEdit();
  }

  openDelete(product: any) {
    this.selectedProduct = product;
    this.showDeleteModal = true;
  }

  closeDelete() {
    this.showDeleteModal = false;
    this.selectedProduct = null;
  }

  confirmDelete() {
    if (!this.selectedProduct) return;
    const id = this.selectedProduct.id ?? this.selectedProduct._id;
    const deletedName = this.selectedProduct.nombre ?? this.selectedProduct.name ?? 'Producto';
    if (id && typeof (this.productService as any).delete === 'function') {
      (this.productService as any).delete(id).subscribe(() => {
        this.addChangeLogEntry('Eliminado', `Producto "${deletedName}" eliminado.`, 'admin');
        this.closeDelete();
      }, () => {
        // fallback local
        this.productos = this.productos.filter(p => (p.id ?? p._id) !== id);
        if (typeof (this.productService as any).loadInitial === 'function') {
          (this.productService as any).loadInitial(this.productos);
        }
        this.addChangeLogEntry('Eliminado', `Producto "${deletedName}" eliminado (local).`, 'admin');
        this.closeDelete();
      });
      return;
    }

    // sin id o sin servicio: eliminar local
    this.productos = this.productos.filter(p => (p.id ?? p._id) !== id);
    if (typeof (this.productService as any).loadInitial === 'function') {
      (this.productService as any).loadInitial(this.productos);
    }
    this.addChangeLogEntry('Eliminado', `Producto "${deletedName}" eliminado.`, 'admin');
    this.closeDelete();
  }
}