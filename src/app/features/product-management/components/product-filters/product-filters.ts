import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, FormControl, ReactiveFormsModule } from '@angular/forms';
import { FilterState } from '../../models/product.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-product-filters',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './product-filters.html',
  styleUrls: ['./product-filters.css']
})
export class ProductFiltersComponent implements OnInit {
  @Input() categories: string[] = [];
  @Input() getCategoryCount!: (cat: string) => number;
  @Output() filtersChange = new EventEmitter<FilterState>();

  filterForm!: FormGroup;
  accordionState: { [key: string]: boolean } = {
    categories: true,
    price: true,
    availability: true,
    sale: true,
    rating: true
  };

  constructor(private fb: FormBuilder) { }

  ngOnInit(): void {
    this.filterForm = this.fb.group({
      categories: this.fb.array(this.categories.map(() => new FormControl(false))),
      minPrice: new FormControl(null),
      maxPrice: new FormControl(null),
      inStock: new FormControl(false),
      onSale: new FormControl(false),
      minRating: new FormControl(null)
    });

    this.filterForm.valueChanges.subscribe(formValue => {
      const selectedCategories = formValue.categories
        .map((checked: boolean, i: number) => checked ? this.categories[i] : null)
        .filter((v: string | null): v is string => v !== null);

      const filterState: FilterState = {
        categories: selectedCategories,
        minPrice: formValue.minPrice,
        maxPrice: formValue.maxPrice,
        inStock: formValue.inStock,
        onSale: formValue.onSale,
        minRating: formValue.minRating
      };
      this.filtersChange.emit(filterState);
    });
  }

  clearFilters(): void {
    this.filterForm.reset({ emitEvent: true });
  }

  toggleAccordion(key: string): void {
    this.accordionState[key] = !this.accordionState[key];
  }
}