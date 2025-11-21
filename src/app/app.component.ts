import { Component, OnInit } from '@angular/core';

import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
// Importa los componentes standalone que se usan en el template
import { UserHeaderComponent } from './features/shared/components/user-header/user-header';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule,
    UserHeaderComponent // <-- Añadido
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'TechStore';
  currentYear = new Date().getFullYear();
  currentTheme: 'light' | 'dark' = 'light';

  ngOnInit(): void {
    // Get saved theme or use system preference as fallback
    const saved = localStorage.getItem('app-theme') as 'light' | 'dark' | null;
    if (saved) {
      this.currentTheme = saved;
    } else {
      // Check system preference
      this.currentTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    this.applyTheme(this.currentTheme);
  }

  toggleTheme(): void {
    this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.applyTheme(this.currentTheme);
    localStorage.setItem('app-theme', this.currentTheme);
  }

  private applyTheme(theme: 'light' | 'dark'): void { // Dejamos este como privado
    document.body.classList.remove('light', 'dark');
    document.body.classList.add(theme);
  }
}
