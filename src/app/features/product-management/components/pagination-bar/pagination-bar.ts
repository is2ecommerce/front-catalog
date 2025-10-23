import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';

import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pagination-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pagination-bar.html',
  styleUrls: ['./pagination-bar.css']
})
export class PaginationBarComponent implements OnChanges {
  // Propiedades de entrada basadas en la respuesta del Backend (PaginatedResponse)
  @Input() currentPage: number = 0; // 0-indexed page number
  @Input() totalPages: number = 0;
  @Input() totalItems: number = 0;
  @Input() pageSize: number = 8;
  
  // Evento de salida para notificar al componente padre (product-list) un cambio de página
  @Output() pageChange = new EventEmitter<number>(); 

  // Array de números de página para el template (solo muestra un rango de 5)
  pages: number[] = [];
  
  // Método que se ejecuta cuando cambian las propiedades de entrada (@Input)
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['totalPages'] || changes['currentPage']) {
      this.generatePageNumbers();
    }
  }

  /**
   * Genera el array de números de página a mostrar (ej. [1, 2, 3, 4, 5, ...])
   */
  generatePageNumbers(): void {
    const maxPagesToShow = 5;
    const half = Math.floor(maxPagesToShow / 2);
    
    let start = Math.max(0, this.currentPage - half);
    let end = Math.min(this.totalPages - 1, this.currentPage + half);
    
    // Ajustar el inicio y el final para centrar
    if (end - start < maxPagesToShow - 1) {
      start = Math.max(0, end - maxPagesToShow + 1);
      end = Math.min(this.totalPages - 1, start + maxPagesToShow - 1);
    }
    
    this.pages = [];
    for (let i = start; i <= end; i++) {
      this.pages.push(i);
    }
  }

  /**
   * @param pageIndex 
   */
  goToPage(pageIndex: number): void {
    if (pageIndex >= 0 && pageIndex < this.totalPages) {
      this.pageChange.emit(pageIndex);
    }
  }


  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.goToPage(this.currentPage + 1);
    }
  }

 
  previousPage(): void {
    if (this.currentPage > 0) {
      this.goToPage(this.currentPage - 1);
    }
  }
}