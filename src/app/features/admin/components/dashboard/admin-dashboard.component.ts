import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { RealtimeService } from '../../../../core/services/realtime.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

export interface MeseroMetricItem {
  meseroId: string;
  nombre: string;
  ventasTotales: number;
  ordenesPagadas: number;
  ordenesCanceladas: number;
  montoCancelado: number;
}

export interface DashboardMetricsResponse {
  periodo: 'hoy' | 'semana' | 'mes';
  comparativa: any;
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
    movil: { ordenes: number; total: number }; // 🛠️ NUEVO
  };
  porMetodoPago: any;
  ventasPorCategoria: any[];
  topVendidos: ProductMetricItem[];
  menosVendidos: ProductMetricItem[];
  cuellosBotella: ProductMetricItem[];
  topMesas: any[];
  ventasPorHora: any[];
  ventasPorDia: any[];
  ventasPorMesero: MeseroMetricItem[]; // 🛠️ NUEVO
  ingredientesMenorStock: any[];
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

  // 🛠️ Nuevos porcentajes para 3 canales
  porcentajeComedor = computed(() => {
    const m = this.metrics();
    if (!m) return 33;
    const suma = m.porCanal.comedor.total + m.porCanal.llevar.total + m.porCanal.movil.total;
    if (suma <= 0) return 33;
    return Math.round((m.porCanal.comedor.total / suma) * 100);
  });

  porcentajeLlevar = computed(() => {
    const m = this.metrics();
    if (!m) return 33;
    const suma = m.porCanal.comedor.total + m.porCanal.llevar.total + m.porCanal.movil.total;
    if (suma <= 0) return 33;
    return Math.round((m.porCanal.llevar.total / suma) * 100);
  });

  porcentajeMovil = computed(() => {
    const m = this.metrics();
    if (!m) return 33;
    const suma = m.porCanal.comedor.total + m.porCanal.llevar.total + m.porCanal.movil.total;
    if (suma <= 0) return 33;
    return Math.round((m.porCanal.movil.total / suma) * 100);
  });

  totalMetodosPago = computed(() => {
    const pm = this.metrics()?.porMetodoPago;
    if (!pm) return 0;
    return pm.efectivo.total + pm.tarjeta.total + pm.transferencia.total;
  });

  ngOnInit(): void {
    this.loadMetrics(true);
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

  // ==================== 📄 GENERACIÓN DE REPORTE PDF ====================
  descargarReportePDF(): void {
    const data = this.metrics();
    if (!data) return;

    const doc = new jsPDF('p', 'mm', 'a4');
    const fechaActual = new Date().toLocaleDateString();

    doc.setFontSize(22);
    doc.setTextColor(171, 36, 36);
    doc.text('SushiGo - Reporte Operativo', 14, 20);

    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(`Período: ${this.periodo().toUpperCase()}`, 14, 28);
    doc.text(`Fecha de emisión: ${fechaActual}`, 14, 34);
    doc.text(`Usuario: ${this.user()?.nombre || 'Admin'}`, 14, 40);

    autoTable(doc, {
      startY: 46,
      head: [['Indicador (KPI)', 'Valor']],
      body: [
        ['Ventas Totales', `$${data.kpis.ventasTotales.toFixed(2)}`],
        ['Órdenes Pagadas', data.kpis.ordenesPagadas.toString()],
        ['Ticket Promedio', `$${data.kpis.ticketPromedio.toFixed(2)}`],
        ['Artículos Vendidos', data.kpis.articulosVendidosTotal.toString()],
        ['Margen Bruto Estimado', `$${data.kpis.margenBruto.toFixed(2)} (${data.kpis.margenPorcentaje}%)`],
        ['Tiempo Promedio Cocina', `${data.kpis.tiempoPromedioOrdenMin} min`],
        ['Órdenes a Tiempo', `${data.kpis.porcentajeATiempo}%`],
        ['Órdenes Canceladas', data.kpis.ordenesCanceladas.toString()],
      ],
      theme: 'grid',
      headStyles: { fillColor: [24, 24, 24], textColor: [255, 255, 255] },
      styles: { fontSize: 10 },
    });

    const startYMeseros = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Desempeño por Mesero', 14, startYMeseros);

    const meserosData = data.ventasPorMesero.map((m) => [
      m.nombre,
      `$${m.ventasTotales.toFixed(2)}`,
      m.ordenesPagadas.toString(),
      m.ordenesCanceladas.toString(),
      `$${m.montoCancelado.toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: startYMeseros + 5,
      head: [['Mesero', 'Ventas', 'Pagadas', 'Canceladas', 'Monto Cancelado']],
      body: meserosData,
      theme: 'striped',
      headStyles: { fillColor: [171, 36, 36] },
    });

    const startYTop = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Top 10 Platillos Más Vendidos', 14, startYTop);

    const topData = data.topVendidos.slice(0, 10).map((item, index) => [
      (index + 1).toString(),
      item.nombre,
      item.categoria,
      item.cantidadVendida.toString(),
      `$${item.ingresos.toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: startYTop + 5,
      head: [['#', 'Platillo', 'Categoría', 'Cant. Vendida', 'Ingresos']],
      body: topData,
      theme: 'striped',
      headStyles: { fillColor: [171, 36, 36] },
    });

    const nombreArchivo = `Reporte_SushiGo_${this.periodo()}_${fechaActual.replace(/\//g, '-')}.pdf`;
    doc.save(nombreArchivo);
  }

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}