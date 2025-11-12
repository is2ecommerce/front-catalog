import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../services/product.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.css']
})
export class ProductFormComponent implements OnInit, OnChanges {
  productForm!: FormGroup;

  @Input() product: any | null = null;
  @Output() saved = new EventEmitter<any>();

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();
    if (this.product) this.patchForm(this.product);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['product'] && this.product) {
      if (!this.productForm) this.initForm();
      this.patchForm(this.product);
    }
  }

  private initForm(): void {
    this.productForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      price: [null, [Validators.required, Validators.min(0.01)]],
      description: ['', [Validators.required, Validators.maxLength(500)]],
      stock: [0, [Validators.required, Validators.min(0)]],
      category: [''],
      imageUrl: ['']
    });
  }

  private patchForm(product: any) {
    this.productForm.patchValue({
      name: product.nombre ?? product.name ?? '',
      price: product.precio ?? product.price ?? null,
      description: product.descripcion ?? product.description ?? '',
      stock: product.stock ?? product.cantidad ?? 0,
      category: Array.isArray(product.categoria) ? product.categoria.join(', ') : (product.categoria ?? product.category ?? ''),
      imageUrl: product.imagen ?? product.imageUrl ?? ''
    });
  }

  onSubmit(): void {
    if (!this.productForm.valid) {
      this.productForm.markAllAsTouched();
      return;
    }

    const value = this.productForm.value;

    const payload: any = {
      ...(this.product ?? {}),
      nombre: value.name,
      precio: value.price,
      descripcion: value.description,
      stock: value.stock,
      categoria: value.category ? value.category.split(',').map((s: string) => s.trim()) : [],
      imagen: value.imageUrl
    };

    // preservar id/_id si existían
    if (this.product) {
      if ((this.product as any).id && !(payload as any).id) (payload as any).id = (this.product as any).id;
      if ((this.product as any)._id && !(payload as any)._id) (payload as any)._id = (this.product as any)._id;
    }

    this.saved.emit(payload);
  }
}
