import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-pos-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pos-login.component.html'
})
export class PosLoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  themeService = inject(ThemeService);

  employeeCode = signal<string>('');
  pin = signal<string>('');
  isAdminView = signal<boolean>(false);
  
  adminEmail = signal<string>('');
  adminPassword = signal<string>('');

  errorMessage = signal<string>('');
  isLoading = signal<boolean>(false);

  toggleAdminView(): void {
    this.isAdminView.update(v => !v);
    this.errorMessage.set('');
  }

  onEmployeeSubmit(): void {
    const code = this.employeeCode().trim();
    const pinVal = this.pin().trim();

    if (!code) {
      this.errorMessage.set('El código de empleado y el PIN son obligatorios');
      return;
    }

    if (!/^\d{4}$/.test(pinVal)) {
      this.errorMessage.set('El PIN debe ser exactamente de 4 dígitos numéricos');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.loginEmployee({
      codigoEmpleado: code,
      pin: pinVal
    }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.user.role === 'Cocina') {
          this.router.navigate(['/kitchen']);
        } else if (res.user.role === 'Admin') {
          this.router.navigate(['/admin']);
        } else {
          this.router.navigate(['/pos']);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Error de conexión con el servidor');
      }
    });
  }

  onAdminSubmit(): void {
    if (!this.adminEmail() || !this.adminPassword()) {
      this.errorMessage.set('El correo electrónico y la contraseña son obligatorios');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.loginAdmin({
      correoElectronico: this.adminEmail(),
      password: this.adminPassword()
    }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/admin']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Credenciales inválidas');
      }
    });
  }
}