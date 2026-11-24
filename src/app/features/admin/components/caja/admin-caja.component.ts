import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { RealtimeService } from '../../../../core/services/realtime.service';

@Component({
  selector: 'app-admin-caja',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-app text-main font-sans flex flex-col">

      <!-- Header -->
      <header class="bg-card border-b border-line px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        <div class="flex items-center gap-3">
          <a routerLink="/admin" class="px-3 py-1.5 rounded-xl bg-hover hover:opacity-80 text-main border border-line text-xs font-bold transition-all">
            ← Dashboard
          </a>
          <div>
            <h1 class="font-bold text-sm sm:text-base">💵 Control de Cajas y Turnos en Vivo</h1>
            <p class="text-[11px] text-muted">Asignación de fondos de cambio y recaudación por mesero</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- SELECTOR DE FECHA -->
          <input 
            type="date" 
            [(ngModel)]="fechaSeleccionada"
            (ngModelChange)="cargarMonitoreo()"
            class="h-9 px-2 bg-input border border-line rounded-xl text-xs font-semibold text-main focus:outline-none focus:border-brand" />

          <button
            type="button"
            (click)="cargarMonitoreo()"
            class="h-9 px-3 bg-hover hover:opacity-80 text-main text-xs font-semibold rounded-xl border border-line transition-all">
            🔄 Actualizar
          </button>
        </div>
      </header>

      <main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">

        @if (feedback()) {
          <div class="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-500 text-xs font-bold">
            {{ feedback() }}
          </div>
        }

        @if (data(); as info) {

          <!-- ==================== RESUMEN GLOBAL EN VIVO ==================== -->
          <section class="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div class="bg-card border border-line rounded-2xl p-4 shadow-2xs">
              <div class="text-[11px] text-muted uppercase font-semibold">Fondos Asignados</div>
              <div class="font-mono font-black text-xl text-main mt-1">
                {{ info.resumenGlobalActivo.fondosAsignados | currency:'MXN':'symbol-narrow':'1.0-0' }}
              </div>
            </div>

            <div class="bg-card border border-line rounded-2xl p-4 shadow-2xs">
              <div class="text-[11px] text-muted uppercase font-semibold">Ventas Efectivo</div>
              <div class="font-mono font-black text-xl text-emerald-500 mt-1">
                {{ info.resumenGlobalActivo.ventasEfectivo | currency:'MXN':'symbol-narrow':'1.0-0' }}
              </div>
            </div>

            <div class="bg-card border border-line rounded-2xl p-4 shadow-2xs">
              <div class="text-[11px] text-muted uppercase font-semibold">Ventas Tarjeta</div>
              <div class="font-mono font-black text-xl text-sky-500 mt-1">
                {{ info.resumenGlobalActivo.ventasTarjeta | currency:'MXN':'symbol-narrow':'1.0-0' }}
              </div>
            </div>

            <div class="bg-card border border-line rounded-2xl p-4 shadow-2xs">
              <div class="text-[11px] text-muted uppercase font-semibold">Transferencias</div>
              <div class="font-mono font-black text-xl text-indigo-500 mt-1">
                {{ info.resumenGlobalActivo.ventasTransferencia | currency:'MXN':'symbol-narrow':'1.0-0' }}
              </div>
            </div>

            <div class="bg-card border border-emerald-500/40 rounded-2xl p-4 col-span-2 lg:col-span-1 shadow-2xs">
              <div class="text-[11px] text-emerald-500 uppercase font-bold">Total en Gavetas</div>
              <div class="font-mono font-black text-xl text-emerald-500 mt-1">
                {{ info.resumenGlobalActivo.efectivoEnGavetas | currency:'MXN':'symbol-narrow':'1.0-0' }}
              </div>
            </div>
          </section>

          <!-- ==================== ASIGNAR FONDO DE CAMBIO A MESERO ==================== -->
          <section class="bg-card border border-line rounded-2xl p-5 shadow-2xs">
            <h2 class="font-bold text-sm text-main mb-3">🪙 Asignar Fondo para Cambio e Iniciar Turno a Mesero</h2>

            @if (info.personalSinTurno.length === 0) {
              <p class="text-xs text-muted">Todo el personal activo ya cuenta con un turno abierto en este momento.</p>
            } @else {
              <div class="flex flex-wrap items-end gap-3">
                <div class="flex-1 min-w-[200px] space-y-1">
                  <label class="text-[11px] font-bold text-muted">Seleccionar Mesero / Cajero</label>
                  <select
                    [(ngModel)]="selectedMeseroId"
                    class="w-full bg-input border border-line rounded-xl px-3 py-2.5 text-xs font-semibold text-main focus:outline-none focus:border-brand">
                    <option value="">-- Elige un integrante --</option>
                    @for (m of info.personalSinTurno; track m.id) {
                      <option [value]="m.id">{{ m.nombre }} ({{ m.rol }})</option>
                    }
                  </select>
                </div>

                <div class="w-44 space-y-1">
                  <label class="text-[11px] font-bold text-muted">Fondo Cambio (MXN)</label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    [(ngModel)]="fondoAsignar"
                    class="w-full bg-input border border-line rounded-xl px-3 py-2.5 font-mono text-xs font-bold text-main focus:outline-none focus:border-brand" />
                </div>

                <button
                  type="button"
                  (click)="asignarFondoMesero()"
                  [disabled]="!selectedMeseroId || isAssigning()"
                  class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-xs font-bold text-white transition-all shadow-xs">
                  {{ isAssigning() ? 'Asignando...' : '+ Abrir Turno y Asignar Fondo' }}
                </button>
              </div>
            }
          </section>

          <!-- ==================== MONITOR EN VIVO POR MESERO ==================== -->
          <section class="space-y-3">
            <div class="flex items-center justify-between">
              <h2 class="font-bold text-sm text-main">📡 Desempeño y Recaudación en Tiempo Real por Mesero</h2>
              <span class="text-xs text-muted">{{ info.turnosAbiertos.length }} turnos abiertos</span>
            </div>

            @if (info.turnosAbiertos.length === 0) {
              <div class="bg-card border border-dashed border-line rounded-2xl p-10 text-center text-xs text-muted">
                No hay turnos abiertos actualmente. Asigna un fondo arriba para iniciar uno.
              </div>
            } @else {
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                @for (t of info.turnosAbiertos; track t.id) {
                  <div class="bg-card border border-line rounded-2xl p-5 space-y-4 relative shadow-2xs">
                    
                    <button 
                      (click)="abrirModalCierre(t)"
                      class="absolute top-4 right-4 bg-brand/15 hover:bg-brand hover:text-white text-brand border border-brand/30 px-3 py-1 rounded-lg text-[10px] font-bold transition-all">
                      Cerrar Turno
                    </button>

                    <div class="flex items-center justify-between border-b border-line pb-3 pr-24">
                      <div>
                        <div class="flex items-center gap-2">
                          <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          <h3 class="font-bold text-base text-main">{{ t.usuario.nombre }}</h3>
                        </div>
                        <p class="text-[11px] text-muted mt-0.5">
                          Inicio: {{ t.abiertoEn | date:'HH:mm' }} · {{ t.ordenesCobradasCount }} órdenes cobradas
                        </p>
                      </div>

                      <div class="text-right">
                        <div class="text-[10px] text-muted uppercase">Venta Total</div>
                        <div class="font-mono font-black text-lg text-main">
                          {{ t.totalRecaudadoVentas | currency:'MXN':'symbol-narrow':'1.0-0' }}
                        </div>
                      </div>
                    </div>

                    <div class="grid grid-cols-3 gap-2 text-xs">
                      <div class="bg-input border border-line rounded-xl p-2.5">
                        <div class="text-[10px] text-muted">💵 Efectivo</div>
                        <div class="font-mono font-bold text-emerald-500 mt-0.5">
                          {{ t.ventasEfectivo | currency:'MXN':'symbol-narrow':'1.0-0' }}
                        </div>
                      </div>

                      <div class="bg-input border border-line rounded-xl p-2.5">
                        <div class="text-[10px] text-muted">💳 Tarjeta</div>
                        <div class="font-mono font-bold text-sky-500 mt-0.5">
                          {{ t.ventasTarjeta | currency:'MXN':'symbol-narrow':'1.0-0' }}
                        </div>
                      </div>

                      <div class="bg-input border border-line rounded-xl p-2.5">
                        <div class="text-[10px] text-muted">🏦 Transf.</div>
                        <div class="font-mono font-bold text-indigo-500 mt-0.5">
                          {{ t.ventasTransferencia | currency:'MXN':'symbol-narrow':'1.0-0' }}
                        </div>
                      </div>
                    </div>

                    <div class="bg-input border border-line rounded-xl p-3 flex items-center justify-between text-xs">
                      <div class="space-y-0.5">
                        <div class="text-muted">
                          Fondo cambio: <span class="font-mono text-main font-bold">{{ t.fondoInicial | currency:'MXN':'symbol-narrow':'1.0-0' }}</span>
                        </div>
                        @if (t.retirosYGastos > 0) {
                          <div class="text-brand font-semibold">
                            Retiros/Gastos: -{{ t.retirosYGastos | currency:'MXN':'symbol-narrow':'1.0-0' }}
                          </div>
                        }
                      </div>
                      <div class="text-right">
                        <div class="text-[10px] text-emerald-500 font-semibold">Efectivo en mano</div>
                        <div class="font-mono font-black text-base text-emerald-500">
                          {{ t.efectivoEnGavetaEsperado | currency:'MXN':'symbol-narrow':'1.2-2' }}
                        </div>
                      </div>
                    </div>
                  </div>
                }
              </div>
            }
          </section>

          <!-- ==================== CORTES CERRADOS DEL DÍA ==================== -->
          @if (info.turnosCerradosHoy.length > 0) {
            <section class="bg-card border border-line rounded-2xl p-5 space-y-3 shadow-2xs">
              <div class="flex items-center justify-between">
                <h2 class="font-bold text-sm text-main">📑 Historial de Cortes del Día</h2>
                <span class="text-[11px] text-muted">{{ fechaSeleccionada | date:'dd/MM/yyyy' }}</span>
              </div>
              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                  <thead class="text-muted border-b border-line">
                    <tr>
                      <th class="pb-2">Mesero</th>
                      <th class="pb-2">Cierre</th>
                      <th class="pb-2 text-right">Ventas Totales</th>
                      <th class="pb-2 text-right">Efectivo Esperado</th>
                      <th class="pb-2 text-right">Contado</th>
                      <th class="pb-2 text-right">Diferencia</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-line">
                    @for (c of info.turnosCerradosHoy; track c.id) {
                      <tr>
                        <td class="py-2.5 font-bold text-main">{{ c.usuario.nombre }}</td>
                        <td class="py-2.5 text-muted">{{ c.cerradoEn | date:'HH:mm' }}</td>
                        <td class="py-2.5 text-right font-mono text-main">{{ c.totalRecaudadoVentas | currency:'MXN':'symbol-narrow' }}</td>
                        <td class="py-2.5 text-right font-mono text-main">{{ c.efectivoEnGavetaEsperado | currency:'MXN':'symbol-narrow' }}</td>
                        <td class="py-2.5 text-right font-mono font-bold text-main">{{ c.efectivoContado | currency:'MXN':'symbol-narrow' }}</td>
                        <td
                          class="py-2.5 text-right font-mono font-bold"
                          [ngClass]="c.diferencia === 0 ? 'text-emerald-500' : c.diferencia > 0 ? 'text-sky-500' : 'text-brand'">
                          {{ c.diferencia > 0 ? '+' : '' }}{{ c.diferencia | currency:'MXN':'symbol-narrow' }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>
          } @else {
            <div class="bg-card border border-dashed border-line rounded-2xl p-10 text-center text-xs text-muted">
              No hay cortes cerrados registrados para la fecha seleccionada.
            </div>
          }

        }
      </main>

      <!-- ==================== MODAL DE CIERRE DE CAJA ==================== -->
      @if (isCierreModalOpen()) {
        <div class="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div class="bg-card border border-line rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            
            <div class="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h2 class="text-base font-bold text-main">Cierre de Caja</h2>
                <p class="text-[11px] text-muted">Mesero: {{ turnoACerrar()?.usuario?.nombre }}</p>
              </div>
              <button (click)="cerrarModalCierre()" class="text-muted hover:text-main text-xl font-bold">&times;</button>
            </div>

            <div class="bg-input border border-line rounded-xl p-3 text-xs space-y-1">
              <div class="flex justify-between text-muted">
                <span>Efectivo Esperado en Gaveta:</span>
                <span class="font-mono font-bold text-main">{{ turnoACerrar()?.efectivoEnGavetaEsperado | currency:'MXN':'symbol-narrow':'1.2-2' }}</span>
              </div>
            </div>

            <div class="space-y-1.5">
              <label class="block text-xs font-bold text-main">Efectivo Físico Contado</label>
              <input 
                type="number" 
                [(ngModel)]="efectivoContado" 
                class="w-full h-11 bg-input border border-line rounded-xl px-3 font-mono text-lg font-bold text-main focus:border-brand focus:outline-none" 
                placeholder="0.00" />
            </div>

            @if (calcularDiferencia() !== 0) {
              <div 
                class="text-xs font-bold p-2 rounded-lg text-center border"
                [ngClass]="calcularDiferencia() > 0 ? 'bg-sky-500/15 text-sky-500 border-sky-500/30' : 'bg-brand/15 text-brand border-brand/30'">
                Diferencia: {{ calcularDiferencia() > 0 ? '+' : '' }}{{ calcularDiferencia() | currency:'MXN':'symbol-narrow':'1.2-2' }}
                ({{ calcularDiferencia() > 0 ? 'Sobrante' : 'Faltante' }})
              </div>
            }

            <div class="flex items-center gap-2 pt-3 border-t border-line">
              <button 
                (click)="cerrarModalCierre()" 
                class="flex-1 py-2.5 rounded-xl bg-hover hover:opacity-80 text-main border border-line text-xs font-bold transition-all">
                Cancelar
              </button>
              <button 
                (click)="confirmarCierreTurno()" 
                [disabled]="isClosingTurno() || efectivoContado === null"
                class="flex-1 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold transition-all disabled:opacity-50">
                {{ isClosingTurno() ? 'Cerrando...' : 'Confirmar Corte' }}
              </button>
            </div>

          </div>
        </div>
      }

    </div>
  `,
})
export class AdminCajaComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private realtimeService = inject(RealtimeService);
  private apiUrl = 'http://localhost:3000/api/v1/turnos';
  private sub = new Subscription();
  private pollingInterval: any = null;

  data = signal<any | null>(null);
  feedback = signal<string | null>(null);
  isAssigning = signal(false);

  // Variable para la fecha seleccionada
  fechaSeleccionada: string = new Date().toISOString().split('T')[0];

  // Estados del Modal de Cierre
  isCierreModalOpen = signal(false);
  turnoACerrar = signal<any | null>(null);
  efectivoContado: number | null = null;
  isClosingTurno = signal(false);

  selectedMeseroId = '';
  fondoAsignar = 500;

  ngOnInit(): void {
    this.cargarMonitoreo();
    
    this.sub.add(
      this.realtimeService.onCajaActualizada().subscribe(() => {
        this.cargarMonitoreo();
      }),
    );

    this.pollingInterval = setInterval(() => {
      this.cargarMonitoreo();
    }, 10000);
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    if (this.pollingInterval) clearInterval(this.pollingInterval);
  }

  cargarMonitoreo(): void {
    const fechaParam = this.fechaSeleccionada ? `?fecha=${this.fechaSeleccionada}` : '';
    
    this.http.get(`${this.apiUrl}/admin/monitoreo${fechaParam}`).subscribe({
      next: (res) => this.data.set(res),
      error: (err) => console.error('Error al cargar monitoreo de cajas:', err),
    });
  }

  asignarFondoMesero(): void {
    if (!this.selectedMeseroId) return;
    this.isAssigning.set(true);

    this.http
      .post<{ message: string }>(`${this.apiUrl}/abrir`, {
        usuarioId: this.selectedMeseroId,
        fondoInicial: Number(this.fondoAsignar || 0),
      })
      .subscribe({
        next: (res) => {
          this.feedback.set(res.message);
          this.selectedMeseroId = '';
          this.isAssigning.set(false);
          this.cargarMonitoreo();
          setTimeout(() => this.feedback.set(null), 4000);
        },
        error: (err) => {
          alert(err?.error?.message || 'No se pudo asignar el turno');
          this.isAssigning.set(false);
        },
      });
  }

  abrirModalCierre(turno: any): void {
    this.turnoACerrar.set(turno);
    this.efectivoContado = null;
    this.isCierreModalOpen.set(true);
  }

  cerrarModalCierre(): void {
    this.isCierreModalOpen.set(false);
    this.turnoACerrar.set(null);
  }

  calcularDiferencia(): number {
    const esperado = this.turnoACerrar()?.efectivoEnGavetaEsperado || 0;
    const contado = this.efectivoContado || 0;
    return Number((contado - esperado).toFixed(2));
  }

  confirmarCierreTurno(): void {
    const turno = this.turnoACerrar();
    if (!turno || this.efectivoContado === null) return;

    this.isClosingTurno.set(true);

    this.http.post<{ message: string }>(`${this.apiUrl}/${turno.id}/cerrar`, {
      efectivoContado: this.efectivoContado,
      notasCierre: this.calcularDiferencia() !== 0 ? 'Cierre con diferencia' : 'Cuadre perfecto'
    }).subscribe({
      next: (res) => {
        this.isClosingTurno.set(false);
        this.cerrarModalCierre();
        this.feedback.set(res.message);
        this.cargarMonitoreo();
        setTimeout(() => this.feedback.set(null), 4000);
      },
      error: (err) => {
        this.isClosingTurno.set(false);
        alert(err?.error?.message || 'Error al cerrar el turno');
      }
    });
  }
}