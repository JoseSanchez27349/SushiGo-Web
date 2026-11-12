import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StaffService } from '../../../../core/services/staff.service';
import { StaffUser, CreateStaffPayload, UpdateStaffPayload } from '../../../../core/models/staff.model';

@Component({
  selector: 'app-staff-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './staff-management.component.html'
})
export class StaffManagementComponent implements OnInit {
  private staffService = inject(StaffService);

  // Estados reactivos con Signals
  staffList = signal<StaffUser[]>([]);
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  // Modal y formulario
  isModalOpen = signal<boolean>(false);
  selectedUser = signal<StaffUser | null>(null); // null si es creación

  // Campos del formulario
  formData = {
    nombre: '',
    apellido: '',
    telefono: '',
    codigoEmpleado: '',
    pin: '',
    rolNombre: 'Mesero' as 'Mesero' | 'Cocina',
    estaActivo: true
  };

  ngOnInit(): void {
    this.loadStaff();
  }

  loadStaff(): void {
    this.isLoading.set(true);
    this.staffService.getStaff().subscribe({
      next: (res) => {
        this.staffList.set(res.usuarios);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Error al cargar el personal');
        this.isLoading.set(false);
      }
    });
  }

  openCreateModal(): void {
    this.selectedUser.set(null);
    this.resetForm();
    this.isModalOpen.set(true);
  }

  openEditModal(user: StaffUser): void {
    this.selectedUser.set(user);
    this.formData = {
      nombre: user.nombre,
      apellido: user.apellido,
      telefono: user.telefono,
      codigoEmpleado: user.codigoEmpleado,
      pin: '', // Opcional al editar
      rolNombre: user.rol.nombre,
      estaActivo: user.estaActivo
    };
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.resetForm();
  }

  resetForm(): void {
    this.formData = {
      nombre: '',
      apellido: '',
      telefono: '',
      codigoEmpleado: '',
      pin: '',
      rolNombre: 'Mesero',
      estaActivo: true
    };
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  saveStaff(): void {
    this.errorMessage.set('');

    if (this.selectedUser()) {
      this.updateStaff();
    } else {
      this.createStaff();
    }
  }

  private createStaff(): void {
    const { nombre, apellido, telefono, codigoEmpleado, pin, rolNombre } = this.formData;

    if (!nombre || !apellido || !telefono || !codigoEmpleado || !pin) {
      this.errorMessage.set('Todos los campos son obligatorios');
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      this.errorMessage.set('El PIN debe ser de 4 dígitos numéricos');
      return;
    }

    this.isSaving.set(true);
    const payload: CreateStaffPayload = { nombre, apellido, telefono, codigoEmpleado, pin, rolNombre };

    this.staffService.createStaff(payload).subscribe({
      next: (res) => {
        this.isSaving.set(false);
        this.successMessage.set(res.message);
        this.closeModal();
        this.loadStaff();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.errorMessage.set(err.error?.message || 'Error al registrar personal');
      }
    });
  }

  private updateStaff(): void {
    const user = this.selectedUser();
    if (!user) return;

    if (this.formData.pin && !/^\d{4}$/.test(this.formData.pin)) {
      this.errorMessage.set('El PIN debe ser exactamente de 4 dígitos numéricos');
      return;
    }

    this.isSaving.set(true);
    const payload: UpdateStaffPayload = {
      nombre: this.formData.nombre,
      apellido: this.formData.apellido,
      telefono: this.formData.telefono,
      codigoEmpleado: this.formData.codigoEmpleado,
      rolNombre: this.formData.rolNombre,
      estaActivo: this.formData.estaActivo
    };

    if (this.formData.pin) {
      payload.pin = this.formData.pin;
    }

    this.staffService.updateStaff(user.id, payload).subscribe({
      next: (res) => {
        this.isSaving.set(false);
        this.successMessage.set(res.message);
        this.closeModal();
        this.loadStaff();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.errorMessage.set(err.error?.message || 'Error al actualizar personal');
      }
    });
  }

  deleteStaff(user: StaffUser): void {
    if (!confirm(`¿Estás seguro de eliminar a ${user.nombre} ${user.apellido}?`)) return;

    this.staffService.deleteStaff(user.id).subscribe({
      next: (res) => {
        this.successMessage.set(res.message);
        this.loadStaff();
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Error al eliminar usuario');
      }
    });
  }
}