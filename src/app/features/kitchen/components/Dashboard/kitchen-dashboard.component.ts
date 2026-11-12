import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { KitchenService } from '../../../../core/services/kitchen.service';
import { EstadoCocina, KitchenComanda, NivelAlertaCocina } from '../../../../core/models/kitchen.model';

@Component({
  selector: 'app-kitchen-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './kitchen-dashboard.component.html'
})
export class KitchenDashboardComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private kitchenService = inject(KitchenService);
  private router = inject(Router);

  user = this.authService.currentUser;
  isAdmin = computed(() => this.user()?.role?.toUpperCase() === 'ADMIN');

  comandas = signal<KitchenComanda[]>([]);
  filtroEstado = signal<'todas' | 'en_espera' | 'en_preparacion'>('todas');
  isLoading = signal<boolean>(true);
  updatingOrderId = signal<string | null>(null);
  autoRefresh = signal<boolean>(true);
  now = signal<number>(Date.now());

  feedbackMessage = signal<string>('');
  feedbackType = signal<'success' | 'error'>('success');

  private pollingIntervalId: ReturnType<typeof setInterval> | null = null;
  private clockIntervalId: ReturnType<typeof setInterval> | null = null;

  filteredComandas = computed(() => {
    const filtro = this.filtroEstado();
    if (filtro === 'todas') return this.comandas();
    return this.comandas().filter(c => c.estadoCocina === filtro);
  });

  stats = computed(() => {
    const lista = this.comandas();
    return {
      total: lista.length,
      enEspera: lista.filter(c => c.estadoCocina === 'en_espera').length,
      enPreparacion: lista.filter(c => c.estadoCocina === 'en_preparacion').length,
      retrasadas: lista.filter(c => this.getLiveTimer(c).estaRetrasada).length
    };
  });

  ngOnInit(): void {
    this.loadComandas(true);

    // Sincronizar con backend cada 12 segundos
    this.pollingIntervalId = setInterval(() => {
      if (this.autoRefresh() && !this.updatingOrderId()) {
        this.loadComandas(false);
      }
    }, 12_000);

    // Actualizar reloj local cada segundo para contadores en vivo
    this.clockIntervalId = setInterval(() => {
      this.now.set(Date.now());
    }, 1_000);
  }

  ngOnDestroy(): void {
    if (this.pollingIntervalId) clearInterval(this.pollingIntervalId);
    if (this.clockIntervalId) clearInterval(this.clockIntervalId);
  }

  loadComandas(showSpinner = false): void {
    if (showSpinner) this.isLoading.set(true);

    this.kitchenService.getComandas().subscribe({
      next: (res) => {
        this.comandas.set(res.comandas || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        if (showSpinner) {
          this.showFeedback('No se pudieron cargar las comandas de cocina', 'error');
        }
      }
    });
  }

  avanzarEstado(comanda: KitchenComanda, nuevoEstado: EstadoCocina): void {
    if (this.updatingOrderId()) return;

    this.updatingOrderId.set(comanda.ordenId);

    this.kitchenService.cambiarEstado(comanda.ordenId, nuevoEstado).subscribe({
      next: (res) => {
        this.updatingOrderId.set(null);

        if (nuevoEstado === 'listo') {
          // Quitar comanda de la pantalla activa al marcarla lista
          this.comandas.update(lista => lista.filter(c => c.ordenId !== comanda.ordenId));
          this.showFeedback(`Folio #${comanda.orden.folio} marcado como LISTO`, 'success');
        } else {
          this.showFeedback(res.message || 'Estado actualizado', 'success');
          this.loadComandas(false);
        }
      },
      error: (err) => {
        this.updatingOrderId.set(null);
        this.showFeedback(
          err.error?.message || 'No se pudo actualizar el estado de la comanda',
          'error'
        );
      }
    });
  }

  // Cálculo dinámico de tiempo transcurrido usando el reloj local
  getLiveTimer(comanda: KitchenComanda): {
    textoTiempo: string;
    minutosTranscurridos: number;
    estaRetrasada: boolean;
    nivelAlerta: NivelAlertaCocina;
  } {
    const referencia = comanda.inicioPreparacionEn || comanda.creadoEn;
    const diffMs = Math.max(0, this.now() - new Date(referencia).getTime());
    const totalSegundos = Math.floor(diffMs / 1000);
    const minutos = Math.floor(totalSegundos / 60);
    const segundos = totalSegundos % 60;

    const tiempoEstimado = comanda.tiempoEstimadoMinutos || 15;
    const estaRetrasada =
      comanda.estadoCocina === 'en_preparacion' && minutos > tiempoEstimado;

    const nivelAlerta: NivelAlertaCocina = estaRetrasada
      ? 'critico'
      : minutos >= 10
        ? 'advertencia'
        : 'normal';

    const mm = String(minutos).padStart(2, '0');
    const ss = String(segundos).padStart(2, '0');

    return {
      textoTiempo: `${mm}:${ss}`,
      minutosTranscurridos: minutos,
      estaRetrasada,
      nivelAlerta
    };
  }

  getMesaLabel(comanda: KitchenComanda): string {
    if (!comanda.orden.mesa) {
      return comanda.orden.tipoOrden === 'llevar' ? 'Para Llevar' : 'Sin Mesa';
    }
    const val = String(comanda.orden.mesa.numeroMesa).trim();
    return /^\d+$/.test(val) ? `Mesa ${val}` : val;
  }

  toggleAutoRefresh(): void {
    this.autoRefresh.update(v => !v);
  }

  showFeedback(msg: string, type: 'success' | 'error'): void {
    this.feedbackMessage.set(msg);
    this.feedbackType.set(type);
    setTimeout(() => {
      if (this.feedbackMessage() === msg) {
        this.feedbackMessage.set('');
      }
    }, 3500);
  }

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}