import { Component, EventEmitter, OnInit, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-pos-turno-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `./pos-turno-modal.component.html
  `,
})
export class PosTurnoModalComponent implements OnInit {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/v1/turnos';

  @Output() closed = new EventEmitter<void>();
  @Output() turnoChanged = new EventEmitter<any>();

  isLoading = signal(true);
  isSubmitting = signal(false);
  errorMsg = signal<string | null>(null);
  tab = signal<'resumen' | 'corte'>('resumen');

  turno = signal<any | null>(null);
  corteGenerado = signal<any | null>(null);

  fondoInicialInput = 500;
  movTipo: 'INGRESO_FONDO' | 'RETIRO' | 'GASTO' = 'RETIRO';
  movMonto: number | null = null;
  movConcepto = '';

  efectivoContadoInput: number | null = null;
  notasCierreInput = '';

  diferenciaPreliminar = computed(() => {
    const esperado = Number(this.turno()?.efectivoEnGavetaEsperado || 0);
    const contado = Number(this.efectivoContadoInput || 0);
    return Number((contado - esperado).toFixed(2));
  });

  ngOnInit(): void {
    this.cargarTurno();
  }

  cargarTurno(): void {
    this.isLoading.set(true);
    this.http.get<{ turno: any }>(`${this.apiUrl}/mi-turno`).subscribe({
      next: (res) => {
        this.turno.set(res.turno);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMsg.set('No se pudo consultar el estado del turno.');
        this.isLoading.set(false);
      },
    });
  }

  abrirTurno(): void {
    this.isSubmitting.set(true);
    this.errorMsg.set(null);
    this.http
      .post<{ turno: any }>(`${this.apiUrl}/abrir`, {
        fondoInicial: Number(this.fondoInicialInput || 0),
      })
      .subscribe({
        next: (res) => {
          this.turno.set(res.turno);
          this.turnoChanged.emit(res.turno);
          this.isSubmitting.set(false);
        },
        error: (err) => {
          this.errorMsg.set(err?.error?.message || 'Error al abrir el turno.');
          this.isSubmitting.set(false);
        },
      });
  }

  registrarMovimiento(): void {
    const t = this.turno();
    if (!t || !this.movMonto || !this.movConcepto.trim()) {
      this.errorMsg.set('Completa el monto y el concepto del movimiento.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMsg.set(null);

    this.http
      .post<{ turno: any }>(`${this.apiUrl}/${t.id}/movimientos`, {
        tipo: this.movTipo,
        monto: Number(this.movMonto),
        concepto: this.movConcepto.trim(),
      })
      .subscribe({
        next: (res) => {
          this.turno.set(res.turno);
          this.turnoChanged.emit(res.turno);
          this.movMonto = null;
          this.movConcepto = '';
          this.isSubmitting.set(false);
        },
        error: (err) => {
          this.errorMsg.set(err?.error?.message || 'Error al registrar movimiento.');
          this.isSubmitting.set(false);
        },
      });
  }

  cerrarTurno(): void {
    const t = this.turno();
    if (!t || this.efectivoContadoInput === null) return;

    this.isSubmitting.set(true);
    this.errorMsg.set(null);

    this.http
      .post<{ corte: any }>(`${this.apiUrl}/${t.id}/cerrar`, {
        efectivoContado: Number(this.efectivoContadoInput),
        notasCierre: this.notasCierreInput,
      })
      .subscribe({
        next: (res) => {
          this.corteGenerado.set(res.corte);
          this.turno.set(null);
          this.turnoChanged.emit(null);
          this.isSubmitting.set(false);
        },
        error: (err) => {
          this.errorMsg.set(err?.error?.message || 'Error al cerrar el turno.');
          this.isSubmitting.set(false);
        },
      });
  }

  imprimirCorte(): void {
    window.print();
  }
}