import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { RealtimeService } from '../../../../core/services/realtime.service';
import { PosTurnoModalComponent } from '../turno-modaL/pos-turno-modal.component';

export interface PosCategory {
  id: number | string;
  nombre: string;
  activa?: boolean;
}

export interface PosProduct {
  id: string;
  nombre: string;
  descripcion?: string | null;
  precio: number | string;
  urlImagen?: string | null;
  estaDisponible: boolean;
  disponibleParaVenta?: boolean;
  porcionesDisponibles?: number | null;
  categoriaId?: number | string;
  categoria: {
    id?: number | string;
    nombre: string;
  };
}

export interface PosTable {
  id: number | string;
  nombre?: string;
  numero?: number;
  estado: 'disponible' | 'ocupada' | 'reservada' | 'mantenimiento' | string;
  capacidad?: number;
}

export interface CartItem {
  product: PosProduct;
  cantidad: number;
  notas: string;
}

export interface ActiveOrderDetail {
  id?: string;
  cantidad: number;
  precioUnitario?: number | string;
  subtotal: number | string;
  notas?: string | null;
  estadoCocina?: string;
  producto: {
    id?: string;
    nombre: string;
  };
}

export interface ActiveOrder {
  id: string;
  folio?: number | string;
  tipoOrden: 'comedor' | 'llevar' | string;
  estado: string;
  estadoCocina?: string;
  total: number | string;
  notas?: string | null;
  creadoEn?: string;
  createdAt?: string;
  mesaId?: string | number | null;
  mesa?: PosTable | null;
  detalles: ActiveOrderDetail[];
}

export interface PagoDraft {
  metodoPago: 'efectivo' | 'tarjeta' | 'transferencia' | string;
  monto: number;
  idTransaccion: string;
}

export interface PaymentReceipt {
  message: string;
  folio: string | number;
  totalOrden: number;
  montoAbonado: number;
  cambio: number;
  puntosAcumulados: number;
}

@Component({
  selector: 'app-pos-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PosTurnoModalComponent],
  templateUrl: './pos-dashboard.component.html',
})
export class PosDashboardComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private router = inject(Router);
  private authService = inject(AuthService);
  private realtimeService = inject(RealtimeService);

  private baseApi = 'http://localhost:3000/api/v1';
  private sub = new Subscription();
  private timerInterval: any = null;

  // Reloj reactivo para cronómetros de órdenes en vivo
  nowTick = signal<number>(Date.now());

  // Estado de conexión y usuario
  socketConnected = signal<boolean>(true);
  soundEnabled = signal<boolean>(true);
  isLoading = signal<boolean>(true);
  isSubmitting = signal<boolean>(false);

  // Control de Turno y Caja
  isTurnoModalOpen = signal<boolean>(false);
  turnoActivo = signal<any | null>(null);

  // Catálogo y mesas
  categorias = signal<PosCategory[]>([]);
  productos = signal<PosProduct[]>([]);
  mesas = signal<PosTable[]>([]);
  selectedCategoryId = signal<number | string | null>(null);
  searchQuery = signal<string>('');

  // Comanda actual
  tipoOrden = signal<'comedor' | 'llevar'>('comedor');
  selectedMesaId = signal<number | string | null>(null);
  cart = signal<CartItem[]>([]);
  ordenNotas = signal<string>('');
  appendTargetOrder = signal<ActiveOrder | null>(null);

  // Órdenes activas / Cuentas abiertas
  ordenesActivas = signal<ActiveOrder[]>([]);
  isOrdersModalOpen = signal<boolean>(false);
  ordersFilter = signal<'todas' | 'sin_iniciar' | 'en_preparacion' | 'listo'>('todas');

  // Cancelación de orden
  cancelTargetOrder = signal<ActiveOrder | null>(null);
  cancelMotivo = signal<string>('');
  isCancelingOrder = signal<boolean>(false);

  // Cobro / Caja
  checkoutOrder = signal<ActiveOrder | null>(null);
  pagosDraft = signal<PagoDraft[]>([]);
  isProcessingPayment = signal<boolean>(false);
  paymentReceipt = signal<PaymentReceipt | null>(null);
  lastPaidOrderId = signal<string | null>(null);

  // Notificaciones flotantes
  feedbackMessage = signal<string>('');
  feedbackType = signal<'success' | 'warning' | 'error'>('success');
  private feedbackTimeout: any = null;

  // Usuario autenticado
  user = computed(() => {
    const authUser =
      (this.authService as any).currentUser?.() ||
      (this.authService as any).user?.();
    if (authUser) return authUser;
    try {
      const raw = sessionStorage.getItem('user');
      return raw ? JSON.parse(raw) : { nombre: 'Mesero', role: 'Mesero' };
    } catch {
      return { nombre: 'Mesero', role: 'Mesero' };
    }
  });

  isAdmin = computed(() => {
    const u = this.user();
    const role = String(u?.role || u?.rol || '').toLowerCase();
    return role === 'admin' || role === 'administrador' || role === 'gerente';
  });

  activeCategorias = computed(() =>
    this.categorias().filter((c) => c.activa !== false),
  );

  filteredProductos = computed(() => {
    const catId = this.selectedCategoryId();
    const query = this.searchQuery().trim().toLowerCase();

    return this.productos().filter((p) => {
      const matchesCat =
        catId === null ||
        String(p.categoriaId ?? p.categoria?.id) === String(catId);
      const matchesQuery =
        !query ||
        p.nombre.toLowerCase().includes(query) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(query)) ||
        p.categoria?.nombre?.toLowerCase().includes(query);
      return matchesCat && matchesQuery;
    });
  });

  cartQuantityMap = computed(() => {
    const map: Record<string, number> = {};
    for (const item of this.cart()) {
      map[item.product.id] = (map[item.product.id] || 0) + item.cantidad;
    }
    return map;
  });

  totalArticulos = computed(() =>
    this.cart().reduce((acc, item) => acc + item.cantidad, 0),
  );

  totalComanda = computed(() =>
    Number(
      this.cart()
        .reduce((acc, item) => acc + Number(item.product.precio) * item.cantidad, 0)
        .toFixed(2),
    ),
  );

  activeOrderForSelectedMesa = computed(() => {
    if (this.tipoOrden() !== 'comedor' || !this.selectedMesaId()) return null;
    return (
      this.ordenesActivas().find(
        (o) =>
          String(o.mesaId ?? o.mesa?.id) === String(this.selectedMesaId()) &&
          o.estado !== 'pagado' &&
          o.estado !== 'cancelado',
      ) || null
    );
  });

  ordenesSinIniciar = computed(() =>
    this.ordenesActivas().filter(
      (o) => this.getEstadoCocinaNormalizado(o) === 'sin_iniciar',
    ),
  );

  ordenesEnPreparacion = computed(() =>
    this.ordenesActivas().filter(
      (o) => this.getEstadoCocinaNormalizado(o) === 'en_preparacion',
    ),
  );

  ordenesListas = computed(() =>
    this.ordenesActivas().filter(
      (o) => this.getEstadoCocinaNormalizado(o) === 'listo',
    ),
  );

  filteredOrdenesActivas = computed(() => {
    const filter = this.ordersFilter();
    const list = this.ordenesActivas();
    if (filter === 'todas') return list;
    return list.filter((o) => this.getEstadoCocinaNormalizado(o) === filter);
  });

  totalCheckout = computed(() => Number(this.checkoutOrder()?.total || 0));

  totalAbonadoCheckout = computed(() =>
    Number(
      this.pagosDraft()
        .reduce((acc, p) => acc + Number(p.monto || 0), 0)
        .toFixed(2),
    ),
  );

  restanteCheckout = computed(() => {
    const diff = Number((this.totalCheckout() - this.totalAbonadoCheckout()).toFixed(2));
    return diff > 0.01 ? diff : 0;
  });

  cambioCheckout = computed(() => {
    const diff = Number((this.totalAbonadoCheckout() - this.totalCheckout()).toFixed(2));
    return diff > 0 ? diff : 0;
  });

  ngOnInit(): void {
    this.refreshAll();
    this.loadMiTurno();
    this.setupRealtime();

    this.timerInterval = setInterval(() => {
      this.nowTick.set(Date.now());
    }, 15000);
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.feedbackTimeout) clearTimeout(this.feedbackTimeout);
  }

  private setupRealtime(): void {
    const rt = this.realtimeService as any;

    if (rt.socket) {
      this.socketConnected.set(Boolean(rt.socket.connected));
      rt.socket.on('connect', () => this.socketConnected.set(true));
      rt.socket.on('disconnect', () => this.socketConnected.set(false));
    }

    if (typeof rt.onOrdenActualizada === 'function') {
      this.sub.add(
        rt.onOrdenActualizada().subscribe((payload: any) => {
          this.loadOrdenesActivas();
          this.loadMesas();
          if (payload?.ordenCompletaLista && this.soundEnabled()) {
            this.playNotificationBeep();
          }
        }),
      );
    }

    if (typeof rt.onNuevaOrden === 'function') {
      this.sub.add(
        rt.onNuevaOrden().subscribe(() => {
          this.loadOrdenesActivas();
          this.loadMesas();
        }),
      );
    }

    if (typeof rt.onInventarioActualizado === 'function') {
      this.sub.add(rt.onInventarioActualizado().subscribe(() => this.loadMenu()));
    }

    if (typeof rt.onCajaActualizada === 'function') {
      this.sub.add(rt.onCajaActualizada().subscribe(() => this.loadMiTurno()));
    }
  }

  refreshAll(): void {
    this.loadMenu();
    this.loadMesas();
    this.loadOrdenesActivas();
  }

  loadMiTurno(): void {
    this.http
      .get<{ turno: any }>(`${this.baseApi}/turnos/mi-turno`)
      .subscribe({
        next: (res) => this.turnoActivo.set(res.turno),
        error: () => this.turnoActivo.set(null),
      });
  }

  loadMenu(): void {
    this.isLoading.set(true);

    this.http.get<any>(`${this.baseApi}/categorias`).subscribe({
      next: (res) => {
        const list = Array.isArray(res)
          ? res
          : res?.categorias || res?.categories || res?.data || [];
        this.categorias.set(list);
      },
      error: (err) => console.error('Error al cargar categorías:', err),
    });

    this.http.get<any>(`${this.baseApi}/productos`).subscribe({
      next: (res) => {
        const list = Array.isArray(res)
          ? res
          : res?.productos || res?.products || res?.data || [];
        this.productos.set(list);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.showFeedback('No se pudo cargar el menú', 'error');
      },
    });
  }

  loadMesas(): void {
    this.http.get<any>(`${this.baseApi}/mesas`).subscribe({
      next: (res) => {
        const list = Array.isArray(res)
          ? res
          : res?.mesas || res?.tables || res?.data || [];
        this.mesas.set(list);
      },
      error: (err) => console.error('Error al cargar mesas:', err),
    });
  }

  loadOrdenesActivas(): void {
    this.http.get<any>(`${this.baseApi}/ordenes/activas`).subscribe({
      next: (res) => {
        const list = Array.isArray(res)
          ? res
          : res?.ordenes || res?.orders || res?.data || [];
        this.ordenesActivas.set(list);
      },
      error: () => {
        this.http.get<any>(`${this.baseApi}/ordenes`).subscribe({
          next: (res) => {
            const raw = Array.isArray(res)
              ? res
              : res?.ordenes || res?.orders || res?.data || [];
            this.ordenesActivas.set(
              raw.filter(
                (o: ActiveOrder) =>
                  o.estado !== 'pagado' && o.estado !== 'cancelado',
              ),
            );
          },
        });
      },
    });
  }

  // ==================== GESTIÓN DE COMANDA ====================

  isProductAvailable(prod: PosProduct): boolean {
    if (!prod.estaDisponible) return false;
    if (prod.disponibleParaVenta === false) return false;
    if (
      prod.porcionesDisponibles !== null &&
      prod.porcionesDisponibles !== undefined &&
      prod.porcionesDisponibles <= 0
    ) {
      return false;
    }
    return true;
  }

  addToCart(prod: PosProduct): void {
    if (!this.isProductAvailable(prod)) {
      this.showFeedback(`"${prod.nombre}" no tiene disponibilidad`, 'warning');
      return;
    }

    const current = this.cart();
    const existingIndex = current.findIndex((i) => i.product.id === prod.id);

    if (existingIndex >= 0) {
      const currentQty = current[existingIndex].cantidad;
      if (
        prod.porcionesDisponibles !== null &&
        prod.porcionesDisponibles !== undefined &&
        currentQty + 1 > prod.porcionesDisponibles
      ) {
        this.showFeedback(
          `Solo quedan ${prod.porcionesDisponibles} porciones de ${prod.nombre}`,
          'warning',
        );
        return;
      }

      const updated = [...current];
      updated[existingIndex] = {
        ...updated[existingIndex],
        cantidad: currentQty + 1,
      };
      this.cart.set(updated);
    } else {
      this.cart.set([...current, { product: prod, cantidad: 1, notas: '' }]);
    }
  }

  incrementItem(item: CartItem): void {
    this.addToCart(item.product);
  }

  decrementItem(item: CartItem): void {
    const current = this.cart();
    if (item.cantidad <= 1) {
      this.cart.set(current.filter((i) => i.product.id !== item.product.id));
    } else {
      this.cart.set(
        current.map((i) =>
          i.product.id === item.product.id
            ? { ...i, cantidad: i.cantidad - 1 }
            : i,
        ),
      );
    }
  }

  updateItemNotes(productId: string, notas: string): void {
    this.cart.update((items) =>
      items.map((i) => (i.product.id === productId ? { ...i, notas } : i)),
    );
  }

  clearCart(): void {
    this.cart.set([]);
    this.ordenNotas.set('');
  }

  setTipoOrden(tipo: 'comedor' | 'llevar'): void {
    this.tipoOrden.set(tipo);
    if (tipo === 'llevar') {
      this.selectedMesaId.set(null);
    }
  }

  selectMesa(mesa: PosTable): void {
    if (mesa.estado === 'mantenimiento') return;
    this.selectedMesaId.set(mesa.id);
  }

  getMesaLabel(mesa: PosTable): string {
    if (mesa.nombre) return mesa.nombre;
    if (mesa.numero !== undefined && mesa.numero !== null) return `Mesa ${mesa.numero}`;
    return 'Mesa';
  }

  startAppendToOrder(ord: ActiveOrder): void {
    this.appendTargetOrder.set(ord);
    if (ord.mesaId || ord.mesa?.id) {
      this.tipoOrden.set('comedor');
      this.selectedMesaId.set(ord.mesaId ?? ord.mesa!.id);
    } else {
      this.tipoOrden.set('llevar');
      this.selectedMesaId.set(null);
    }
    this.isOrdersModalOpen.set(false);
    this.showFeedback(`Agregando ronda a ${this.formatFolio(ord)}`, 'success');
  }

  clearAppendTarget(): void {
    this.appendTargetOrder.set(null);
  }

  submitOrden(): void {
    if (this.cart().length === 0 || this.isSubmitting()) return;

    if (
      !this.appendTargetOrder() &&
      this.tipoOrden() === 'comedor' &&
      !this.selectedMesaId()
    ) {
      this.showFeedback('Selecciona una mesa para enviar la comanda', 'warning');
      return;
    }

    this.isSubmitting.set(true);

    const itemsPayload = this.cart().map((i) => ({
      productoId: i.product.id,
      cantidad: i.cantidad,
      notas: i.notas.trim() || undefined,
    }));

    const target = this.appendTargetOrder();

    if (target) {
      this.http
        .post(`${this.baseApi}/ordenes/${target.id}/items`, {
          items: itemsPayload,
          notas: this.ordenNotas().trim() || undefined,
        })
        .subscribe({
          next: () => {
            this.isSubmitting.set(false);
            this.clearCart();
            this.appendTargetOrder.set(null);
            this.refreshAll();
            this.showFeedback(
              `Ronda agregada a ${this.formatFolio(target)} y enviada a cocina`,
              'success',
            );
          },
          error: (err) => {
            this.isSubmitting.set(false);
            this.showFeedback(
              err?.error?.message || 'Error al agregar ronda a la orden',
              'error',
            );
          },
        });
      return;
    }

    const payload = {
      tipoOrden: this.tipoOrden(),
      mesaId: this.tipoOrden() === 'comedor' ? this.selectedMesaId() : null,
      notas: this.ordenNotas().trim() || undefined,
      items: itemsPayload,
    };

    this.http.post(`${this.baseApi}/ordenes`, payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.clearCart();
        this.refreshAll();
        this.showFeedback('✅ Comanda enviada a cocina', 'success');
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.showFeedback(
          err?.error?.message || 'Error al registrar la orden',
          'error',
        );
      },
    });
  }

  // ==================== CUENTAS ABIERTAS Y ESTADOS COCINA ====================

  openOrdersModal(filter: 'todas' | 'sin_iniciar' | 'en_preparacion' | 'listo' = 'todas'): void {
    this.ordersFilter.set(filter);
    this.loadOrdenesActivas();
    this.isOrdersModalOpen.set(true);
  }

  formatFolio(ord: ActiveOrder): string {
    if (ord.folio !== undefined && ord.folio !== null) {
      return `#${String(ord.folio).padStart(3, '0')}`;
    }
    return `#${String(ord.id).slice(0, 6).toUpperCase()}`;
  }

  getEstadoCocinaNormalizado(ord: ActiveOrder): 'sin_iniciar' | 'en_preparacion' | 'listo' {
    const raw = String(ord.estadoCocina || ord.estado || '').toLowerCase();
    if (raw === 'listo' || raw === 'completado' || raw === 'entregado') {
      return 'listo';
    }
    if (raw === 'en_preparacion' || raw === 'preparando') {
      return 'en_preparacion';
    }
    if (Array.isArray(ord.detalles) && ord.detalles.length > 0) {
      const estados = ord.detalles.map((d) =>
        String(d.estadoCocina || 'pendiente').toLowerCase(),
      );
      if (estados.every((e) => e === 'listo' || e === 'cancelado')) return 'listo';
      if (estados.some((e) => e === 'en_preparacion' || e === 'listo')) {
        return 'en_preparacion';
      }
    }
    return 'sin_iniciar';
  }

  getEstadoOrdenLabel(ord: ActiveOrder): string {
    const estado = this.getEstadoCocinaNormalizado(ord);
    if (estado === 'listo') return '✅ Listo para cobrar';
    if (estado === 'en_preparacion') return '🔥 En preparación';
    return '⏳ Sin iniciar';
  }

  isOrdenListaParaCobrar(ord: ActiveOrder): boolean {
    return this.getEstadoCocinaNormalizado(ord) === 'listo';
  }

  getOrdenElapsedTimer(ord: ActiveOrder): string {
    const createdStr = ord.creadoEn || ord.createdAt;
    if (!createdStr) return '';
    const diffMs = Math.max(0, this.nowTick() - new Date(createdStr).getTime());
    const mins = Math.floor(diffMs / 60000);
    return `${mins} min`;
  }

  // ==================== CANCELACIÓN DE ORDEN ====================

  openCancelOrderModal(ord: ActiveOrder): void {
    this.cancelTargetOrder.set(ord);
    this.cancelMotivo.set('');
  }

  closeCancelOrderModal(): void {
    this.cancelTargetOrder.set(null);
    this.cancelMotivo.set('');
  }

  confirmarCancelacionOrden(): void {
    const ord = this.cancelTargetOrder();
    if (!ord || !this.cancelMotivo().trim() || this.isCancelingOrder()) return;

    this.isCancelingOrder.set(true);

    this.http
      .patch(`${this.baseApi}/ordenes/${ord.id}/cancelar`, {
        motivo: this.cancelMotivo().trim(),
      })
      .subscribe({
        next: () => {
          this.isCancelingOrder.set(false);
          this.closeCancelOrderModal();
          this.refreshAll();
          this.showFeedback(
            `Orden ${this.formatFolio(ord)} cancelada e insumos reintegrados`,
            'warning',
          );
        },
        error: (err) => {
          this.isCancelingOrder.set(false);
          this.showFeedback(
            err?.error?.message || 'No se pudo cancelar la orden',
            'error',
          );
        },
      });
  }

  // ==================== COBRO Y TICKETS ====================

  openCheckoutModal(ord: ActiveOrder): void {
    if (!this.turnoActivo()) {
      this.isOrdersModalOpen.set(false);
      this.showFeedback(
        '⚠️ Abre tu turno de caja o solicita tu fondo antes de cobrar',
        'error',
      );
      this.isTurnoModalOpen.set(true);
      return;
    }

    this.isOrdersModalOpen.set(false);
    this.paymentReceipt.set(null);
    this.lastPaidOrderId.set(null);
    this.checkoutOrder.set(ord);
    this.pagosDraft.set([
      {
        metodoPago: 'efectivo',
        monto: Number(ord.total),
        idTransaccion: '',
      },
    ]);
  }

  closeCheckoutModal(): void {
    this.checkoutOrder.set(null);
    this.paymentReceipt.set(null);
    this.pagosDraft.set([]);
  }

  setMontoRapido(monto: number): void {
    const list = [...this.pagosDraft()];
    if (list.length > 0) {
      list[0] = { ...list[0], monto: Number(monto) };
      this.pagosDraft.set(list);
    }
  }

  addPagoLine(): void {
    const restante = this.restanteCheckout();
    this.pagosDraft.update((list) => [
      ...list,
      {
        metodoPago: 'tarjeta',
        monto: restante > 0 ? restante : 0,
        idTransaccion: '',
      },
    ]);
  }

  removePagoLine(index: number): void {
    this.pagosDraft.update((list) => list.filter((_, i) => i !== index));
  }

  updatePagoMetodo(index: number, metodoPago: string): void {
    this.pagosDraft.update((list) =>
      list.map((p, i) => (i === index ? { ...p, metodoPago } : p)),
    );
  }

  updatePagoMonto(index: number, monto: number): void {
    this.pagosDraft.update((list) =>
      list.map((p, i) => (i === index ? { ...p, monto: Number(monto || 0) } : p)),
    );
  }

  updatePagoTransaccion(index: number, idTransaccion: string): void {
    this.pagosDraft.update((list) =>
      list.map((p, i) => (i === index ? { ...p, idTransaccion } : p)),
    );
  }

  procesarCobro(): void {
    const ord = this.checkoutOrder();
    if (!ord || this.restanteCheckout() > 0 || this.isProcessingPayment()) return;

    this.isProcessingPayment.set(true);

    const pagosPayload = this.pagosDraft().map((p) => ({
      metodoPago: p.metodoPago,
      monto: Number(p.monto),
      idTransaccion: p.idTransaccion?.trim() || undefined,
    }));

    this.http
      .post<PaymentReceipt>(`${this.baseApi}/pagos/orden/${ord.id}`, {
        pagos: pagosPayload,
      })
      .subscribe({
        next: (res) => {
          this.isProcessingPayment.set(false);
          this.lastPaidOrderId.set(ord.id);
          this.paymentReceipt.set(res);
          this.refreshAll();
          this.loadMiTurno();
        },
        error: (err) => {
          this.isProcessingPayment.set(false);
          this.showFeedback(
            err?.error?.message || 'Error al registrar el cobro',
            'error',
          );
        },
      });
  }

  reimprimirTicket(ordenId: string, tipo: 'precuenta' | 'ticket_final'): void {
    this.http
      .post(`${this.baseApi}/pagos/orden/${ordenId}/reimpresion`, { tipo })
      .subscribe({
        next: () => {
          this.showFeedback(
            tipo === 'precuenta'
              ? '🧾 Precuenta enviada a impresión'
              : '🖨️ Ticket final reimpreso',
            'success',
          );
        },
        error: () => {
          window.print();
        },
      });
  }

  // ==================== UTILIDADES UI Y SESIÓN ====================

  toggleSound(): void {
    this.soundEnabled.update((v) => !v);
  }

  private playNotificationBeep(): void {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch {
      // Ignorar si el navegador bloquea autoplay de audio
    }
  }

  showFeedback(msg: string, type: 'success' | 'warning' | 'error' = 'success'): void {
    this.feedbackMessage.set(msg);
    this.feedbackType.set(type);
    if (this.feedbackTimeout) clearTimeout(this.feedbackTimeout);
    this.feedbackTimeout = setTimeout(() => {
      this.feedbackMessage.set('');
    }, 4000);
  }

  onLogout(): void {
    const auth = this.authService as any;
    if (typeof auth.logout === 'function') {
      auth.logout();
    } else {
      sessionStorage.clear();
      this.router.navigate(['/login']);
    }
  }
}