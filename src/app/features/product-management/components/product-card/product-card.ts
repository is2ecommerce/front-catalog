import { Component, Input } from '@angular/core';
import { Product } from '../../models/product.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-card.html',
  styleUrls: ['./product-card.css']
})
export class ProductCardComponent {
  @Input() product!: Product;

  get discountLabel(): string {
    if (this.product && this.product.discountPercentage > 0) {
      return `-${this.product.discountPercentage}%`;
    }
    return '';
  }

  get imageUrl(): string {
    if (this.product?.imagePath) {
      return this.product.imagePath;
    }
    if (this.product?.imageUrl) {
      // Asume que si no es una ruta completa, necesita 'assets/'
      return this.product.imageUrl.startsWith('assets/') ? this.product.imageUrl : `assets/${this.product.imageUrl}`;
    }
    return ''; // O una imagen por defecto
  }
}