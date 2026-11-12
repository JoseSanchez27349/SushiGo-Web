import { Routes } from '@angular/router';
import { PosLoginComponent } from './features/auth/pos-login.component';
import { PosDashboardComponent } from './features/pos/components/dashboard/pos-dashboard.component';
import { KitchenDashboardComponent } from './features/kitchen/components/Dashboard/kitchen-dashboard.component';
import { AdminDashboardComponent } from './features/admin/components/dashboard/admin-dashboard.component';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
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
  { path: 'login', component: PosLoginComponent },
  { path: 'pos', component: PosDashboardComponent },
  { path: 'kitchen', component: KitchenDashboardComponent },
  { path: 'admin', component: AdminDashboardComponent },
  { path: '**', redirectTo: 'login' }
];