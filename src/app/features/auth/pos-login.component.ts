import { Component, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-pos-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pos-login.component.html'
})
export class PosLoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  employeeCode = signal<string>('');
  pin = signal<string>('');
  activeInput = signal<'code' | 'pin'>('code');
  isAdminView = signal<boolean>(false);
  
  adminEmail = signal<string>('');
  adminPassword = signal<string>('');

  errorMessage = signal<string>('');
  isLoading = signal<boolean>(false);

  numericButtons: string[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  setActiveInput(target: 'code' | 'pin'): void {
    this.activeInput.set(target);
  }

  appendDigit(val: string): void {
    this.errorMessage.set('');
    if (this.activeInput() === 'code') {
      if (this.employeeCode().length < 10) {
        this.employeeCode.update(c => c + val);
      }
    } else {
      if (this.pin().length < 4) { // Límite de 4 dígitos para el PIN
        this.pin.update(c => c + val);
      }
    }
  }

  deleteDigit(): void {
    this.errorMessage.set('');
    if (this.activeInput() === 'code') {
      this.employeeCode.update(c => c.slice(0, -1));
    } else {
      this.pin.update(c => c.slice(0, -1));
    }
  }

  clearCurrentInput(): void {
    this.errorMessage.set('');
    if (this.activeInput() === 'code') {
      this.employeeCode.set('');
    } else {
      this.pin.set('');
    }
  }

  quickFill(code: string, pin: string): void {
    this.employeeCode.set(code);
    this.pin.set(pin);
    this.errorMessage.set('');
  }

  toggleAdminView(): void {
    this.isAdminView.update(v => !v);
    this.errorMessage.set('');
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (this.isAdminView()) return;

    if (event.key >= '0' && event.key <= '9') {
      this.appendDigit(event.key);
    } else if (event.key === 'Backspace') {
      this.deleteDigit();
    } else if (event.key === 'Enter') {
      this.onEmployeeSubmit();
    } else if (event.key === 'Tab') {
      event.preventDefault();
      this.activeInput.set(this.activeInput() === 'code' ? 'pin' : 'code');
    }
  }

  onEmployeeSubmit(): void {
    if (!this.employeeCode()) {
      this.errorMessage.set('El código de empleado y el PIN son obligatorios');
      return;
    }

    // Validación coincidente con la regex de tu backend (/^\d{4}$/)
    if (!/^\d{4}$/.test(this.pin())) {
      this.errorMessage.set('El PIN debe ser exactamente de 4 dígitos numéricos');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.loginEmployee({
      codigoEmpleado: this.employeeCode(),
      pin: this.pin()
    }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        // Enrutamiento según el rol recibido ("Cocina", "Mesero", "Admin")
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