import { Component, OnInit } from '@angular/core';
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
export class ProductFormComponent implements OnInit {
  productForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.productForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      price: [null, [Validators.required, Validators.min(0.01)]],
      description: ['', [Validators.required, Validators.maxLength(500)]],
      stock: [0, [Validators.required, Validators.min(0)]],
      // Por ahora, un simple input de texto para las categorías.
      category: [''], 
      imageUrl: ['']
    });
  }

  onSubmit(): void {
    if (this.productForm.valid) {
      console.log('Formulario enviado:', this.productForm.value);
      // Aquí iría la llamada al servicio para guardar el producto.
      // this.productService.createProduct(this.productForm.value).subscribe(...);
    }
  }
}