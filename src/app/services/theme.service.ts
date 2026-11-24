import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  // Inicia en false = Modo Oscuro por defecto
  isLight = signal<boolean>(false);

  constructor() {
    const saved = localStorage.getItem('sushigo-theme');
    if (saved === 'light') {
      this.setTheme(true);
    }
  }

  toggleTheme(): void {
    this.setTheme(!this.isLight());
  }

  private setTheme(light: boolean): void {
    this.isLight.set(light);
    const html = document.documentElement;
    if (light) {
      html.classList.add('light');
      localStorage.setItem('sushigo-theme', 'light');
    } else {
      html.classList.remove('light');
      localStorage.setItem('sushigo-theme', 'dark');
    }
  }
}