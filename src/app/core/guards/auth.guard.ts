import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard para proteger rutas privadas por autenticación y rol
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const currentUser = authService.currentUser();
  const token = authService.token();

  // 1. Si no hay token o usuario en memoria, redirigir al login
  if (!token || !currentUser) {
    router.navigate(['/login']);
    return false;
  }

  // 2. Verificar permisos por rol según la metadata de la ruta
  const expectedRoles = route.data['roles'] as Array<string>;
  
  if (expectedRoles && !expectedRoles.includes(currentUser.role)) {
    // Si intenta entrar a un área no permitida para su rol, redirigir a su panel correspondiente
    redirectByRole(currentUser.role, router);
    return false;
  }

  return true;
};

/**
 * Guard para evitar que usuarios logueados vuelvan a la pantalla de /login
 */
export const publicGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const currentUser = authService.currentUser();
  const token = authService.token();

  if (token && currentUser) {
    redirectByRole(currentUser.role, router);
    return false;
  }

  return true;
};

/**
 * Función auxiliar de redirección según el rol activo
 */
function redirectByRole(role: string, router: Router): void {
  if (role === 'Admin') {
    router.navigate(['/admin']);
  } else if (role === 'Cocina') {
    router.navigate(['/kitchen']);
  } else {
    router.navigate(['/pos']);
  }
}