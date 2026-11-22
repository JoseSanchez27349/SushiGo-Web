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
    <div class="min-h-screen bg-[#0d0d0d] text-white font-sans flex flex-col">

      <!-- Header -->
      <header class="bg-[#181818] border-b border-zinc-800 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <div class="flex items-center gap-3">
          <a routerLink="/admin" class="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold">
            ← Dashboard
          </a>
          <div>
            <h1 class="font-bold text-sm sm:text-base">💵 Control de Cajas y Turnos en Vivo</h1>
            <p class="text-[11px] text-zinc-400">Asignación de fondos de cambio y recaudación por mesero</p>
          </div>
        </div>

        <button
          type="button"
          (click)="cargarMonitoreo()"
          class="h-9 px-3 bg-[#222222] hover:bg-zinc-700 text-xs font-semibold rounded-xl border border-zinc-700">
          🔄 Actualizar
        </button>
      </header>

      <main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">

        @if (feedback()) {
          <div class="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
            {{ feedback() }}
          </div>
        }

        @if (data(); as info) {

          <!-- ==================== RESUMEN GLOBAL EN VIVO ==================== -->
          <section class="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div class="bg-[#181818] border border-zinc-800 rounded-2xl p-4">
              <div class="text-[11px] text-zinc-400 uppercase font-semibold">Fondos Asignados</div>
              <div class="font-mono font-black text-xl text-white mt-1">
                {{ info.resumenGlobalActivo.fondosAsignados | currency:'MXN':'symbol-narrow':'1.0-0' }}
              </div>
            </div>

            <div class="bg-[#181818] border border-zinc-800 rounded-2xl p-4">
              <div class="text-[11px] text-zinc-400 uppercase font-semibold">Ventas Efectivo</div>
              <div class="font-mono font-black text-xl text-emerald-400 mt-1">
                {{ info.resumenGlobalActivo.ventasEfectivo | currency:'MXN':'symbol-narrow':'1.0-0' }}
              </div>
            </div>

            <div class="bg-[#181818] border border-zinc-800 rounded-2xl p-4">
              <div class="text-[11px] text-zinc-400 uppercase font-semibold">Ventas Tarjeta</div>
              <div class="font-mono font-black text-xl text-sky-400 mt-1">
                {{ info.resumenGlobalActivo.ventasTarjeta | currency:'MXN':'symbol-narrow':'1.0-0' }}
              </div>
            </div>

            <div class="bg-[#181818] border border-zinc-800 rounded-2xl p-4">
              <div class="text-[11px] text-zinc-400 uppercase font-semibold">Transferencias</div>
              <div class="font-mono font-black text-xl text-indigo-400 mt-1">
                {{ info.resumenGlobalActivo.ventasTransferencia | currency:'MXN':'symbol-narrow':'1.0-0' }}
              </div>
            </div>

            <div class="bg-[#181818] border border-emerald-500/40 rounded-2xl p-4 col-span-2 lg:col-span-1">
              <div class="text-[11px] text-emerald-300 uppercase font-bold">Total en Gavetas</div>
              <div class="font-mono font-black text-xl text-emerald-400 mt-1">
                {{ info.resumenGlobalActivo.efectivoEnGavetas | currency:'MXN':'symbol-narrow':'1.0-0' }}
              </div>
            </div>
          </section>

          <!-- ==================== ASIGNAR FONDO DE CAMBIO A MESERO ==================== -->
          <section class="bg-[#181818] border border-zinc-800 rounded-2xl p-5">
            <h2 class="font-bold text-sm text-white mb-3">🪙 Asignar Fondo para Cambio e Iniciar Turno a Mesero</h2>

            @if (info.personalSinTurno.length === 0) {
              <p class="text-xs text-zinc-400">Todo el personal activo ya cuenta con un turno abierto en este momento.</p>
            } @else {
              <div class="flex flex-wrap items-end gap-3">
                <div class="flex-1 min-w-[200px] space-y-1">
                  <label class="text-[11px] font-bold text-zinc-400">Seleccionar Mesero / Cajero</label>
                  <select
                    [(ngModel)]="selectedMeseroId"
                    class="w-full bg-[#111111] border border-zinc-700 rounded-xl px-3 py-2.5 text-xs font-semibold text-white">
                    <option value="">-- Elige un integrante --</option>
                    @for (m of info.personalSinTurno; track m.id) {
                      <option [value]="m.id">{{ m.nombre }} ({{ m.rol }})</option>
                    }
                  </select>
                </div>

                <div class="w-44 space-y-1">
                  <label class="text-[11px] font-bold text-zinc-400">Fondo Cambio (MXN)</label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    [(ngModel)]="fondoAsignar"
                    class="w-full bg-[#111111] border border-zinc-700 rounded-xl px-3 py-2.5 font-mono text-xs font-bold text-white" />
                </div>

                <button
                  type="button"
                  (click)="asignarFondoMesero()"
                  [disabled]="!selectedMeseroId || isAssigning()"
                  class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-xs font-bold text-white transition-all">
                  {{ isAssigning() ? 'Asignando...' : '+ Abrir Turno y Asignar Fondo' }}
                </button>
              </div>
            }
          </section>

          <!-- ==================== MONITOR EN VIVO POR MESERO ==================== -->
          <section class="space-y-3">
            <div class="flex items-center justify-between">
              <h2 class="font-bold text-sm text-white">📡 Desempeño y Recaudación en Tiempo Real por Mesero</h2>
              <span class="text-xs text-zinc-400">{{ info.turnosAbiertos.length }} turnos abiertos</span>
            </div>

            @if (info.turnosAbiertos.length === 0) {
              <div class="bg-[#181818] border border-dashed border-zinc-800 rounded-2xl p-10 text-center text-xs text-zinc-500">
                No hay turnos abiertos actualmente. Asigna un fondo arriba para iniciar uno.
              </div>
            } @else {
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                @for (t of info.turnosAbiertos; track t.id) {
                  <div class="bg-[#181818] border border-zinc-800 rounded-2xl p-5 space-y-4 relative">
                    
                    <!-- Botón de Cerrar Turno (Arriba a la derecha) -->
                    <button 
                      (click)="abrirModalCierre(t)"
                      class="absolute top-4 right-4 bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-500/30 px-3 py-1 rounded-lg text-[10px] font-bold transition-all">
                      Cerrar Turno
                    </button>

                    <div class="flex items-center justify-between border-b border-zinc-800 pb-3 pr-24">
                      <div>
                        <div class="flex items-center gap-2">
                          <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          <h3 class="font-bold text-base text-white">{{ t.usuario.nombre }}</h3>
                        </div>
                        <p class="text-[11px] text-zinc-400 mt-0.5">
                          Inicio: {{ t.abiertoEn | date:'HH:mm' }} · {{ t.ordenesCobradasCount }} órdenes cobradas
                        </p>
                      </div>

                      <div class="text-right">
                        <div class="text-[10px] text-zinc-400 uppercase">Venta Total</div>
                        <div class="font-mono font-black text-lg text-white">
                          {{ t.totalRecaudadoVentas | currency:'MXN':'symbol-narrow':'1.0-0' }}
                        </div>
                      </div>
                    </div>

                    <!-- Desglose Efectivo vs Tarjeta vs Transferencia -->
                    <div class="grid grid-cols-3 gap-2 text-xs">
                      <div class="bg-[#111111] border border-zinc-800 rounded-xl p-2.5">
                        <div class="text-[10px] text-zinc-400">💵 Efectivo</div>
                        <div class="font-mono font-bold text-emerald-400 mt-0.5">
                          {{ t.ventasEfectivo | currency:'MXN':'symbol-narrow':'1.0-0' }}
                        </div>
                      </div>

                      <div class="bg-[#111111] border border-zinc-800 rounded-xl p-2.5">
                        <div class="text-[10px] text-zinc-400">💳 Tarjeta</div>
                        <div class="font-mono font-bold text-sky-400 mt-0.5">
                          {{ t.ventasTarjeta | currency:'MXN':'symbol-narrow':'1.0-0' }}
                        </div>
                      </div>

                      <div class="bg-[#111111] border border-zinc-800 rounded-xl p-2.5">
                        <div class="text-[10px] text-zinc-400">🏦 Transf.</div>
                        <div class="font-mono font-bold text-indigo-400 mt-0.5">
                          {{ t.ventasTransferencia | currency:'MXN':'symbol-narrow':'1.0-0' }}
                        </div>
                      </div>
                    </div>

                    <!-- Balance de Gaveta -->
                    <div class="bg-[#111111] border border-zinc-800 rounded-xl p-3 flex items-center justify-between text-xs">
                      <div class="space-y-0.5">
                        <div class="text-zinc-400">
                          Fondo cambio: <span class="font-mono text-white font-bold">{{ t.fondoInicial | currency:'MXN':'symbol-narrow':'1.0-0' }}</span>
                        </div>
                        @if (t.retirosYGastos > 0) {
                          <div class="text-red-400">
                            Retiros/Gastos: -{{ t.retirosYGastos | currency:'MXN':'symbol-narrow':'1.0-0' }}
                          </div>
                        }
                      </div>
                      <div class="text-right">
                        <div class="text-[10px] text-emerald-300 font-semibold">Efectivo en mano</div>
                        <div class="font-mono font-black text-base text-emerald-400">
                          {{ t.efectivoEnGavetaEsperado | currency:'MXN':'symbol-narrow':'1.2-2' }}
                        </div>
                      </div>
                    </div>
                  </div>
                }
              </div>
            }
          </section>

          <!-- ==================== CORTES CERRADOS HOY (HISTORIAL) ==================== -->
          @if (info.turnosCerradosHoy.length > 0) {
            <section class="bg-[#181818] border border-zinc-800 rounded-2xl p-5 space-y-3">
              <h2 class="font-bold text-sm text-white">📑 Historial de Cortes (Hoy)</h2>
              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                  <thead class="text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th class="pb-2">Mesero</th>
                      <th class="pb-2">Cierre</th>
                      <th class="pb-2 text-right">Ventas Totales</th>
                      <th class="pb-2 text-right">Efectivo Esperado</th>
                      <th class="pb-2 text-right">Contado</th>
                      <th class="pb-2 text-right">Diferencia</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-zinc-800/70">
                    @for (c of info.turnosCerradosHoy; track c.id) {
                      <tr>
                        <td class="py-2.5 font-bold text-white">{{ c.usuario.nombre }}</td>
                        <td class="py-2.5 text-zinc-400">{{ c.cerradoEn | date:'HH:mm' }}</td>
                        <td class="py-2.5 text-right font-mono">{{ c.totalRecaudadoVentas | currency:'MXN':'symbol-narrow' }}</td>
                        <td class="py-2.5 text-right font-mono">{{ c.efectivoEnGavetaEsperado | currency:'MXN':'symbol-narrow' }}</td>
                        <td class="py-2.5 text-right font-mono font-bold">{{ c.efectivoContado | currency:'MXN':'symbol-narrow' }}</td>
                        <td
                          class="py-2.5 text-right font-mono font-bold"
                          [ngClass]="c.diferencia === 0 ? 'text-emerald-400' : c.diferencia > 0 ? 'text-sky-400' : 'text-red-400'">
                          {{ c.diferencia > 0 ? '+' : '' }}{{ c.diferencia | currency:'MXN':'symbol-narrow' }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>
          }

        }
      </main>

      <!-- ==================== MODAL DE CIERRE DE CAJA ==================== -->
      @if (isCierreModalOpen()) {
        <div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-[#181818] border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            
            <div class="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h2 class="text-base font-bold text-white">Cierre de Caja</h2>
                <p class="text-[11px] text-zinc-400">Mesero: {{ turnoACerrar()?.usuario?.nombre }}</p>
              </div>
              <button (click)="cerrarModalCierre()" class="text-zinc-400 hover:text-white text-xl font-bold">&times;</button>
            </div>

            <div class="bg-[#111111] border border-zinc-800 rounded-xl p-3 text-xs space-y-1">
              <div class="flex justify-between text-zinc-400">
                <span>Efectivo Esperado en Gaveta:</span>
                <span class="font-mono font-bold text-white">{{ turnoACerrar()?.efectivoEnGavetaEsperado | currency:'MXN':'symbol-narrow':'1.2-2' }}</span>
              </div>
            </div>

            <div class="space-y-1.5">
              <label class="block text-xs font-bold text-zinc-300">Efectivo Físico Contado</label>
              <input 
                type="number" 
                [(ngModel)]="efectivoContado" 
                class="w-full h-11 bg-[#111111] border border-zinc-700 rounded-xl px-3 font-mono text-lg font-bold text-white focus:border-red-500 focus:outline-none" 
                placeholder="0.00" />
            </div>

            @if (calcularDiferencia() !== 0) {
              <div 
                class="text-xs font-bold p-2 rounded-lg text-center"
                [ngClass]="calcularDiferencia() > 0 ? 'bg-sky-950/50 text-sky-400' : 'bg-red-950/50 text-red-400'">
                Diferencia: {{ calcularDiferencia() > 0 ? '+' : '' }}{{ calcularDiferencia() | currency:'MXN':'symbol-narrow':'1.2-2' }}
                ({{ calcularDiferencia() > 0 ? 'Sobrante' : 'Faltante' }})
              </div>
            }

            <div class="flex items-center gap-2 pt-3 border-t border-zinc-800">
              <button 
                (click)="cerrarModalCierre()" 
                class="flex-1 py-2.5 rounded-xl bg-[#222222] hover:bg-zinc-800 text-zinc-300 text-xs font-bold transition-all">
                Cancelar
              </button>
              <button 
                (click)="confirmarCierreTurno()" 
                [disabled]="isClosingTurno() || efectivoContado === null"
                class="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all disabled:opacity-50">
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
    this.http.get(`${this.apiUrl}/admin/monitoreo`).subscribe({
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

  // --- Lógica para Cerrar Turno ---
  abrirModalCierre(turno: any): void {
    this.turnoACerrar.set(turno);
    this.efectivoContado = null; // Resetear el input
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

    // 🛠️ CORRECCIÓN: Se usa .post() para coincidir con la ruta del backend
    this.http.post<{ message: string }>(`${this.apiUrl}/${turno.id}/cerrar`, {
      efectivoContado: this.efectivoContado,
      notasCierre: this.calcularDiferencia() !== 0 ? 'Cierre con diferencia' : 'Cuadre perfecto'
    }).subscribe({
      next: (res) => {
        this.isClosingTurno.set(false);
        this.cerrarModalCierre();
        this.feedback.set(res.message);
        this.cargarMonitoreo(); // Refresca la pantalla
        setTimeout(() => this.feedback.set(null), 4000);
      },
      error: (err) => {
        this.isClosingTurno.set(false);
        alert(err?.error?.message || 'Error al cerrar el turno');
      }
    });
  }
}