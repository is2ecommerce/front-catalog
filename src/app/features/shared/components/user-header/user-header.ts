import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-user-header',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './user-header.html',
  styleUrls: ['./user-header.css'] // <-- Aseguramos que cargue el CSS
})
export class UserHeaderComponent implements OnInit, OnDestroy {
  @Output() logoClick = new EventEmitter<void>();

  searchQuery = '';

  private searchSubject = new Subject<string>();
  private searchSubscription!: Subscription;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.searchSubscription = this.searchSubject.pipe(
      // Espera 300ms después de la última pulsación antes de emitir el valor
      debounceTime(300),
      // Solo emite si el valor nuevo es diferente al anterior
      distinctUntilChanged()
    ).subscribe(query => {
      this.router.navigate(['/products'], { queryParams: { query: query.trim() } });
    });
  }

  ngOnDestroy(): void {
    // Buena práctica: cancelar la suscripción para evitar fugas de memoria
    this.searchSubscription.unsubscribe();
  }

  onSearch(): void {
    // Cada vez que el usuario escribe, enviamos el valor al Subject
    this.searchSubject.next(this.searchQuery);
  }

  onLogoClick(): void {
    this.logoClick.emit();
  }
}