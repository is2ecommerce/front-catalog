import { Component, Input, OnInit } from '@angular/core';
import { Product } from '../../models/product.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-card.html',
  styleUrls: ['./product-card.css']
})
export class ProductCardComponent implements OnInit {
  @Input() product!: Product;

  ngOnInit(): void {}

  onImgError(evt: Event) {
    const img = evt.target as HTMLImageElement;
    img.src = 'https://placehold.co/600x400?text=Sin+imagen';
  }
}