import { Routes } from '@angular/router';
import { PosLoginComponent } from './features/auth/pos-login.component';
import { PosDashboardComponent } from './features/pos/components/dashboard/pos-dashboard.component';
import { KitchenDashboardComponent } from './features/kitchen/components/Dashboard/kitchen-dashboard.component';
import { AdminDashboardComponent } from './features/admin/components/dashboard/admin-dashboard.component';
import { StaffManagementComponent } from './features/admin/components/Staff/staff-management.component';
import { authGuard, publicGuard } from './core/guards/auth.guard';
import { MenuManagementComponent } from './features/admin/components/menu/menu-management.component';
import { InventoryManagementComponent } from './features/admin/components/inventario/inventory-management.component';
import { TableManagementComponent } from './features/admin/components/mesas/table-management.component';

export const routes: Routes = [
  // Ruta pública de Login (Bloqueada si ya estás autenticado)
  { 
    path: 'login', 
    component: PosLoginComponent,
    canActivate: [publicGuard] 
  },

  // Terminal POS (Meseros y Administradores)
  { 
    path: 'pos', 
    component: PosDashboardComponent,
    canActivate: [authGuard],
    data: { roles: ['Mesero', 'Admin'] }
  },

  // Pantalla KDS (Cocina y Administradores)
  { 
    path: 'kitchen', 
    component: KitchenDashboardComponent,
    canActivate: [authGuard],
    data: { roles: ['Cocina', 'Admin'] }
  },

  // Módulo de Administración (Exclusivo para Admin)
  {
    path: 'admin',
    canActivate: [authGuard],
    data: { roles: ['Admin'] },
    children: [
      { path: '', component: AdminDashboardComponent },
      { path: 'staff', component: StaffManagementComponent },
      { path: 'menu', component: MenuManagementComponent },
      { path: 'inventory', component: InventoryManagementComponent },
      { path: 'tables',component: TableManagementComponent},
    ]
  },

  // Redirecciones por defecto
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' }
];