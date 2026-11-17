import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common'; // <-- Importante para usar *ngIf o @if de forma limpia

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  readonly router = inject(Router);

  // Getter que evalúa si estamos en una vista pública
  get isPublicView(): boolean {
    const url = this.router.url;
    // Ocultamos la barra si estamos en login, pos, kitchen o admin
    return !url.includes('/login') && 
           !url.includes('/pos') && 
           !url.includes('/kitchen') && 
           !url.includes('/admin');
  }
}