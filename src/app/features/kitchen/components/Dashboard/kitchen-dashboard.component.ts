import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { RealtimeService } from '../../../../core/services/realtime.service';
import {
  EstadoCocina,
  KitchenComanda,
  KitchenOrderItem,
  NivelAlertaCocina,
} from '../../../../core/models/kitchen.model';

@Component({
  selector: 'app-kitchen-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './kitchen-dashboard.component.html',
})
export class KitchenDashboardComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private router = inject(Router);
  private authService = inject(AuthService);
  private realtimeService = inject(RealtimeService);

  private apiUrl = 'http://localhost:3000/api/v1/cocina';
  private pollIntervalId: ReturnType<typeof setInterval> | null = null;
  private clockIntervalId: ReturnType<typeof setInterval> | null = null;
  private realtimeSub = new Subscription();

  user = this.authService.currentUser;
  isAdmin = computed(() => this.user()?.role === 'Admin');

  soundEnabled = this.realtimeService.soundEnabled;
  socketConnected = this.realtimeService.isConnected;

  comandas = signal<KitchenComanda[]>([]);
  isLoading = signal<boolean>(true);
  autoRefresh = signal<boolean>(true);
  filtroEstado = signal<'todas' | 'en_espera' | 'en_preparacion'>('todas');

  updatingOrderId = signal<string | null>(null);
  updatingItemId = signal<string | null>(null);

  feedbackMessage = signal<string>('');
  feedbackType = signal<'success' | 'error'>('success');
  now = signal<number>(Date.now());

  stats = computed(() => {
    const lista = this.comandas();
    let enEspera = 0;
    let enPreparacion = 0;
    let retrasadas = 0;

    for (const c of lista) {
      if (c.estadoCocina === 'en_espera') enEspera++;
      if (c.estadoCocina === 'en_preparacion') enPreparacion++;
      if (this.getLiveTimer(c).estaRetrasada) retrasadas++;
    }

    return {
      total: lista.length,
      enEspera,
      enPreparacion,
      retrasadas,
    };
  });

  filteredComandas = computed(() => {
    const filtro = this.filtroEstado();
    const lista = this.comandas();
    if (filtro === 'todas') return lista;
    return lista.filter((c) => c.estadoCocina === filtro);
  });

  ngOnInit(): void {
    this.loadComandas(true);

    // Reloj en vivo cada segundo
    this.clockIntervalId = setInterval(() => {
      this.now.set(Date.now());
    }, 1_000);

    // Respaldo de sincronización cada 15s por si hay microcortes de red
    this.pollIntervalId = setInterval(() => {
      if (this.autoRefresh()) {
        this.loadComandas(false);
      }
    }, 15_000);

    // Notificaciones instantáneas vía Socket.io
    this.realtimeSub.add(
      this.realtimeService.onNuevaComanda().subscribe((evento) => {
        this.realtimeService.playKitchenAlert();
        this.loadComandas(false);

        const destino = evento.mesa ? `Mesa ${evento.mesa}` : 'Para Llevar';
        const mensaje = evento.esRondaAdicional
          ? `➕ Nueva ronda en Folio #${evento.folio} (${destino})`
          : `🔥 Nueva comanda #${evento.folio} (${destino})`;
        this.showFeedback(mensaje, 'success');
      }),
    );

    this.realtimeSub.add(
      this.realtimeService.onOrdenCancelada().subscribe((evento) => {
        this.comandas.update((lista) => lista.filter((c) => c.ordenId !== evento.ordenId));
        this.showFeedback(`🗑️ Orden #${evento.folio} cancelada desde POS`, 'error');
      }),
    );
  }

  ngOnDestroy(): void {
    if (this.pollIntervalId) clearInterval(this.pollIntervalId);
    if (this.clockIntervalId) clearInterval(this.clockIntervalId);
    this.realtimeSub.unsubscribe();
  }

  loadComandas(showSpinner = false): void {
    if (showSpinner) this.isLoading.set(true);

    this.http.get<{ comandas: KitchenComanda[] }>(`${this.apiUrl}/comandas`).subscribe({
      next: (res) => {
        this.comandas.set(res.comandas || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar comandas:', err);
        this.isLoading.set(false);
        if (showSpinner) {
          this.showFeedback('No se pudieron cargar las comandas de cocina', 'error');
        }
      },
    });
  }

  toggleAutoRefresh(): void {
    this.autoRefresh.update((v) => !v);
    if (this.autoRefresh()) {
      this.loadComandas(false);
    }
  }

  toggleSound(): void {
    this.realtimeService.toggleSound();
  }

  // Cambiar estado de un platillo individual
  avanzarEstadoItem(
    comanda: KitchenComanda,
    item: KitchenOrderItem,
    nuevoEstado: EstadoCocina,
  ): void {
    if (this.updatingItemId()) return;
    this.updatingItemId.set(item.id);

    this.http
      .put<{ message: string; ordenCompletaLista: boolean }>(
        `${this.apiUrl}/items/${item.id}/estado`,
        { estadoCocina: nuevoEstado },
      )
      .subscribe({
        next: (res) => {
          this.updatingItemId.set(null);
          if (res.ordenCompletaLista) {
            this.showFeedback(
              `✅ Orden #${comanda.orden.folio} completa y enviada a caja`,
              'success',
            );
          }
          this.loadComandas(false);
        },
        error: (err) => {
          this.updatingItemId.set(null);
          this.showFeedback(
            err?.error?.message || 'Error al actualizar el platillo',
            'error',
          );
        },
      });
  }

  // Cambiar estado de toda la comanda en bloque
  avanzarEstado(comanda: KitchenComanda, nuevoEstado: EstadoCocina): void {
    if (this.updatingOrderId()) return;
    this.updatingOrderId.set(comanda.ordenId);

    this.http
      .put<{ message: string }>(`${this.apiUrl}/comandas/${comanda.ordenId}/estado`, {
        estadoCocina: nuevoEstado,
      })
      .subscribe({
        next: () => {
          this.updatingOrderId.set(null);
          const texto =
            nuevoEstado === 'listo'
              ? `✅ Orden #${comanda.orden.folio} liberada para cobro`
              : `🔥 Comanda #${comanda.orden.folio} en preparación`;
          this.showFeedback(texto, 'success');
          this.loadComandas(false);
        },
        error: (err) => {
          this.updatingOrderId.set(null);
          this.showFeedback(
            err?.error?.message || 'Error al actualizar estado de la comanda',
            'error',
          );
        },
      });
  }

  // Contador general ininterrumpido desde que nació la orden + tiempo secundario de preparación
  getLiveTimer(comanda: KitchenComanda): {
    textoTiempo: string;
    textoPreparacion: string | null;
    minutosTranscurridos: number;
    estaRetrasada: boolean;
    nivelAlerta: NivelAlertaCocina;
  } {
    const referenciaTotal = comanda.orden.creadoEn || comanda.creadoEn;
    const diffMs = Math.max(0, this.now() - new Date(referenciaTotal).getTime());
    const totalSegundos = Math.floor(diffMs / 1000);
    const minutos = Math.floor(totalSegundos / 60);
    const segundos = totalSegundos % 60;

    let textoPreparacion: string | null = null;
    if (comanda.inicioPreparacionEn) {
      const diffPrep = Math.max(
        0,
        this.now() - new Date(comanda.inicioPreparacionEn).getTime(),
      );
      const segPrep = Math.floor(diffPrep / 1000);
      const minPrep = Math.floor(segPrep / 60);
      const remPrep = segPrep % 60;
      textoPreparacion = `${String(minPrep).padStart(2, '0')}:${String(remPrep).padStart(2, '0')}`;
    }

    const tiempoEstimado = comanda.tiempoEstimadoMinutos || 15;
    const estaRetrasada = minutos > tiempoEstimado;

    const nivelAlerta: NivelAlertaCocina = estaRetrasada
      ? 'critico'
      : minutos >= 10
        ? 'advertencia'
        : 'normal';

    return {
      textoTiempo: `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`,
      textoPreparacion,
      minutosTranscurridos: minutos,
      estaRetrasada,
      nivelAlerta,
    };
  }

  getItemTimerText(item: KitchenOrderItem): string {
    if (!item.creadoEn) return '';
    const diffMs = Math.max(0, this.now() - new Date(item.creadoEn).getTime());
    const totalSeg = Math.floor(diffMs / 1000);
    const mm = String(Math.floor(totalSeg / 60)).padStart(2, '0');
    const ss = String(totalSeg % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }

  getItemsListosCount(comanda: KitchenComanda): number {
    return comanda.orden.detalles.filter((d) => d.estadoCocina === 'listo').length;
  }

  getMesaLabel(comanda: KitchenComanda): string {
    if (comanda.orden.mesa) {
      return `Mesa ${comanda.orden.mesa.numeroMesa}`;
    }
    return comanda.orden.tipoOrden === 'llevar' ? 'Para Llevar' : comanda.orden.tipoOrden;
  }

  showFeedback(message: string, type: 'success' | 'error'): void {
    this.feedbackMessage.set(message);
    this.feedbackType.set(type);
    setTimeout(() => {
      if (this.feedbackMessage() === message) {
        this.feedbackMessage.set('');
      }
    }, 4500);
  }

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}