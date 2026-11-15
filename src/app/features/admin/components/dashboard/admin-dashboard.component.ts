import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { RealtimeService } from '../../../../core/services/realtime.service';

export interface ProductMetricItem {
  productoId: string;
  nombre: string;
  categoria: string;
  cantidadVendida: number;
  ingresos: number;
  tiempoPromedioPrepMin: number | null;
  tiempoPromedioEsperaMin: number | null;
  muestrasTiempo: number;
}

export interface DashboardMetricsResponse {
  periodo: 'hoy' | 'semana' | 'mes';
  comparativa: {
    ventasAnterior: number;
    crecimientoVentasPorcentaje: number;
    ordenesAnterior: number;
    crecimientoOrdenesPorcentaje: number;
    ticketPromedioAnterior: number;
    crecimientoTicketPorcentaje: number;
  };
  kpis: {
    ventasTotales: number;
    ticketPromedio: number;
    ordenesPagadas: number;
    ordenesCanceladas: number;
    montoCancelado: number;
    tasaCancelacionPorcentaje: number;
    articulosVendidosTotal: number;
    ordenesActivasCount: number;
    ventasPorCobrar: number;
    costoInsumos: number;
    margenBruto: number;
    margenPorcentaje: number;
    tiempoPromedioOrdenMin: number;
    tiempoPromedioFuegoMin: number;
    porcentajeATiempo: number;
    mesasOcupadas: number;
    mesasTotal: number;
    ingredientesAgotadosCount: number;
  };
  porCanal: {
    comedor: { ordenes: number; total: number };
    llevar: { ordenes: number; total: number };
  };
  porMetodoPago: {
    efectivo: { transacciones: number; total: number };
    tarjeta: { transacciones: number; total: number };
    transferencia: { transacciones: number; total: number };
  };
  ventasPorCategoria: {
    categoria: string;
    cantidad: number;
    total: number;
    porcentaje: number;
  }[];
  topVendidos: ProductMetricItem[];
  menosVendidos: ProductMetricItem[];
  cuellosBotella: ProductMetricItem[];
  topMesas: {
    mesaId: number;
    numeroMesa: string;
    ordenes: number;
    total: number;
  }[];
  ventasPorHora: {
    hora: string;
    total: number;
    ordenes: number;
  }[];
  ventasPorDia: {
    fecha: string;
    total: number;
    ordenes: number;
  }[];
  ingredientesMenorStock: {
    id: string;
    nombre: string;
    stockActual: number;
    unidadMedida: string;
  }[];
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-dashboard.component.html',
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private router = inject(Router);
  private authService = inject(AuthService);
  private realtimeService = inject(RealtimeService);

  private apiUrl = 'http://localhost:3000/api/v1/admin/dashboard';
  private realtimeSub = new Subscription();

  user = this.authService.currentUser;
  socketConnected = this.realtimeService.isConnected;

  periodo = signal<'hoy' | 'semana' | 'mes'>('hoy');
  isLoading = signal<boolean>(true);
  metrics = signal<DashboardMetricsResponse | null>(null);
  lastUpdated = signal<Date>(new Date());

  maxVentaHora = computed(() => {
    const slots = this.metrics()?.ventasPorHora || [];
    const max = Math.max(...slots.map((s) => s.total), 0);
    return max > 0 ? max : 1;
  });

  maxVentaDia = computed(() => {
    const slots = this.metrics()?.ventasPorDia || [];
    const max = Math.max(...slots.map((s) => s.total), 0);
    return max > 0 ? max : 1;
  });

  maxPrepCuelloBotella = computed(() => {
    const items = this.metrics()?.cuellosBotella || [];
    const max = Math.max(...items.map((i) => i.tiempoPromedioPrepMin || 0), 0);
    return max > 0 ? max : 15;
  });

  porcentajeComedor = computed(() => {
    const m = this.metrics();
    if (!m) return 50;
    const suma = m.porCanal.comedor.total + m.porCanal.llevar.total;
    if (suma <= 0) return 50;
    return Math.round((m.porCanal.comedor.total / suma) * 100);
  });

  totalMetodosPago = computed(() => {
    const pm = this.metrics()?.porMetodoPago;
    if (!pm) return 0;
    return pm.efectivo.total + pm.tarjeta.total + pm.transferencia.total;
  });

  ngOnInit(): void {
    this.loadMetrics(true);

    // Recarga silenciosa en tiempo real ante movimiento en POS o Cocina
    this.realtimeSub.add(
      this.realtimeService.onNuevaComanda().subscribe(() => this.loadMetrics(false)),
    );
    this.realtimeSub.add(
      this.realtimeService.onPosOrdenActualizada().subscribe(() => this.loadMetrics(false)),
    );
    this.realtimeSub.add(
      this.realtimeService.onOrdenCancelada().subscribe(() => this.loadMetrics(false)),
    );
  }

  ngOnDestroy(): void {
    this.realtimeSub.unsubscribe();
  }

  setPeriodo(nuevoPeriodo: 'hoy' | 'semana' | 'mes'): void {
    if (this.periodo() === nuevoPeriodo) return;
    this.periodo.set(nuevoPeriodo);
    this.loadMetrics(true);
  }

  loadMetrics(showSpinner = false): void {
    if (showSpinner) this.isLoading.set(true);

    this.http
      .get<DashboardMetricsResponse>(`${this.apiUrl}?periodo=${this.periodo()}`)
      .subscribe({
        next: (res) => {
          this.metrics.set(res);
          this.lastUpdated.set(new Date());
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Error al cargar métricas de administración:', err);
          this.isLoading.set(false);
        },
      });
  }

  getBarHeightPercent(total: number): number {
    if (total <= 0) return 4;
    return Math.max(8, Math.round((total / this.maxVentaHora()) * 100));
  }

  getDailyBarHeightPercent(total: number): number {
    if (total <= 0) return 4;
    return Math.max(8, Math.round((total / this.maxVentaDia()) * 100));
  }

  getBottleneckWidthPercent(minutos: number | null): number {
    if (!minutos || minutos <= 0) return 5;
    return Math.min(100, Math.max(10, Math.round((minutos / this.maxPrepCuelloBotella()) * 100)));
  }

  getMetodoPagoPercent(monto: number): number {
    const total = this.totalMetodosPago();
    if (total <= 0) return 0;
    return Math.round((monto / total) * 100);
  }

  formatCrecimiento(porcentaje: number): string {
    const signo = porcentaje > 0 ? '+' : '';
    return `${signo}${porcentaje.toFixed(1)}%`;
  }

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}