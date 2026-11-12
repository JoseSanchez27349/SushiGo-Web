import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EstadoMesa, TableService } from '../../../../core/services/table.service';
import { Mesa } from '../../../../core/models/order.model';

@Component({
  selector: 'app-table-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './table-management.component.html'
})
export class TableManagementComponent implements OnInit {
  private tableService = inject(TableService);

  mesas = signal<Mesa[]>([]);
  isLoading = signal<boolean>(true);
  isSaving = signal<boolean>(false);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  readonly estadosDisponibles: EstadoMesa[] = [
    'disponible',
    'ocupada',
    'reservada',
    'mantenimiento'
  ];

  // Contadores reactivos
  disponiblesCount = computed(() =>
    this.mesas().filter(m => m.estado === 'disponible').length
  );
  ocupadasCount = computed(() =>
    this.mesas().filter(m => m.estado === 'ocupada').length
  );
  reservadasCount = computed(() =>
    this.mesas().filter(m => m.estado === 'reservada').length
  );
  mantenimientoCount = computed(() =>
    this.mesas().filter(m => m.estado === 'mantenimiento').length
  );

  // Modal Nueva Mesa
  isModalOpen = signal<boolean>(false);
  mesaForm = {
    numeroMesa: '',
    capacidad: 4
  };

  ngOnInit(): void {
    this.loadMesas();
  }

  loadMesas(): void {
    this.isLoading.set(true);
    this.tableService.getMesas().subscribe({
      next: (res) => {
        this.mesas.set(res.mesas || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Error al cargar las mesas');
        this.isLoading.set(false);
      }
    });
  }

  formatMesaTitle(numeroMesa: string): string {
    return /^\d+$/.test(numeroMesa.trim()) ? `Mesa ${numeroMesa}` : numeroMesa;
  }

  getTotalActivoMesa(mesa: Mesa): number {
    if (!mesa.ordenes || mesa.ordenes.length === 0) return 0;
    return mesa.ordenes.reduce((acc, ord) => acc + Number(ord.total || 0), 0);
  }

  openCreateModal(): void {
    const sugerido = String(this.mesas().length + 1);
    this.mesaForm = {
      numeroMesa: sugerido,
      capacidad: 4
    };
    this.errorMessage.set('');
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.errorMessage.set('');
  }

  saveMesa(): void {
    const numeroStr = String(this.mesaForm.numeroMesa || '').trim();
    if (!numeroStr) {
      this.errorMessage.set('El identificador o número de mesa es obligatorio');
      return;
    }

    const cap = Number(this.mesaForm.capacidad);
    if (isNaN(cap) || cap <= 0) {
      this.errorMessage.set('Ingresa una capacidad válida mayor a 0');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');

    this.tableService.createMesa({
      numeroMesa: numeroStr,
      capacidad: cap
    }).subscribe({
      next: (res) => {
        this.isSaving.set(false);
        this.successMessage.set(res.message);
        this.closeModal();
        this.loadMesas();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.errorMessage.set(err.error?.message || 'Error al crear la mesa');
      }
    });
  }

  onChangeEstado(mesa: Mesa, nuevoEstado: string): void {
    if (mesa.estado === nuevoEstado) return;

    this.tableService.cambiarEstadoMesa(mesa.id, nuevoEstado as EstadoMesa).subscribe({
      next: (res) => {
        this.successMessage.set(res.message);
        this.loadMesas();
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'No se pudo actualizar el estado de la mesa');
      }
    });
  }
}