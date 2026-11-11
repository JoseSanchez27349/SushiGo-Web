import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then(m => m.Home),
    title: 'SushiGo | Inicio'
  },
  {
    path: 'menu',
    loadComponent: () => import('./pages/menu/menu').then(m => m.Menu),
    title: 'SushiGo | Menú'
  },
  {
    path: 'contacto',
    loadComponent: () => import('./pages/contact/contact').then(m => m.Contact),
    title: 'SushiGo | Contacto'
  },
  { path: '**', redirectTo: '', pathMatch: 'full' }
];