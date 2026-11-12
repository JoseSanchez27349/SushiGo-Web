import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { MenuService } from '../../../../core/services/menu.service';
import { OrderService } from '../../../../core/services/order.service';
import { PaymentService } from '../../../../core/services/payment.service';
import { Category, Product } from '../../../../core/models/menu.model';
import { ActiveOrder, CreateOrderPayload, Mesa } from '../../../../core/models/order.model';
import {
  MetodoPago,
  PagoItemPayload,
  RegistrarPagoResponse,
  TipoTicketReimpresion
} from '../../../../core/models/payment.model';

export interface PosCartItem {
  product: Product;
  cantidad: number;
  notas: string;
}

export type EstadoCocinaPos = 'sin_iniciar' | 'en_preparacion' | 'listo';
export type FiltroOrdenesPos = 'todas' | EstadoCocinaPos;

@Component({
  selector: 'app-pos-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './pos-dashboard.component.html'
})
export class PosDashboardComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private menuService = inject(MenuService);
  private orderService = inject(OrderService);
  private paymentService = inject(PaymentService);
  private router = inject(Router);

  user = this.authService.currentUser;
  isAdmin = computed(() => this.user()?.role?.toUpperCase() === 'ADMIN');

  // Catálogo, Mesas y Órdenes Activas
  categorias = signal<Category[]>([]);
  productos = signal<Product[]>([]);
  mesas = signal<Mesa[]>([]);
  ordenesActivas = signal<ActiveOrder[]>([]);

  selectedCategoryId = signal<number | null>(null);
  searchQuery = signal<string>('');

  // Estados UI
  isLoading = signal<boolean>(true);
  isSubmitting = signal<boolean>(false);
  isOrdersModalOpen = signal<boolean>(false);
  ordersFilter = signal<FiltroOrdenesPos>('todas');
  feedbackMessage = signal<string>('');
  feedbackType = signal<'success' | 'warning' | 'error'>('success');

  // Control de polling y alertas de cocina
  private pollingIntervalId: ReturnType<typeof setInterval> | null = null;
  private previousOrderStates = new Map<string, EstadoCocinaPos>();
  private initialOrdersLoaded = false;

  // Datos de la Comanda actual
  tipoOrden = signal<'comedor' | 'llevar'>('comedor');
  selectedMesaId = signal<number | null>(null);
  cart = signal<PosCartItem[]>([]);
  ordenNotas = signal<string>('');

  // ==================== ESTADOS DE COBRO / CAJA ====================
  checkoutOrder = signal<ActiveOrder | null>(null);
  pagosDraft = signal<PagoItemPayload[]>([]);
  isProcessingPayment = signal<boolean>(false);
  paymentReceipt = signal<RegistrarPagoResponse | null>(null);
  lastPaidOrderId = signal<string | number | null>(null);

  // Clasificación de órdenes por estado de cocina
  ordenesSinIniciar = computed(() =>
    this.ordenesActivas().filter(ord => this.getEstadoCocinaNormalizado(ord) === 'sin_iniciar')
  );

  ordenesEnPreparacion = computed(() =>
    this.ordenesActivas().filter(ord => this.getEstadoCocinaNormalizado(ord) === 'en_preparacion')
  );

  ordenesListas = computed(() =>
    this.ordenesActivas().filter(ord => this.getEstadoCocinaNormalizado(ord) === 'listo')
  );

  filteredOrdenesActivas = computed(() => {
    const filtro = this.ordersFilter();
    if (filtro === 'todas') return this.ordenesActivas();
    return this.ordenesActivas().filter(ord => this.getEstadoCocinaNormalizado(ord) === filtro);
  });

  totalCheckout = computed(() => Number(this.checkoutOrder()?.total || 0));

  totalAbonadoCheckout = computed(() =>
    Number(
      this.pagosDraft()
        .reduce((acc, p) => acc + (Number(p.monto) || 0), 0)
        .toFixed(2)
    )
  );

  restanteCheckout = computed(() =>
    Math.max(0, Number((this.totalCheckout() - this.totalAbonadoCheckout()).toFixed(2)))
  );

  cambioCheckout = computed(() =>
    Math.max(0, Number((this.totalAbonadoCheckout() - this.totalCheckout()).toFixed(2)))
  );

  // Solo categorías activas
  activeCategorias = computed(() =>
    this.categorias().filter(c => c.estaActiva)
  );

  // Filtro combinado por categoría y búsqueda
  filteredProductos = computed(() => {
    const catId = this.selectedCategoryId();
    const query = this.searchQuery().trim().toLowerCase();

    return this.productos().filter(prod => {
      const matchesCat = catId === null || prod.categoriaId === catId;
      const matchesQuery =
        !query ||
        prod.nombre.toLowerCase().includes(query) ||
        (prod.descripcion && prod.descripcion.toLowerCase().includes(query));
      return matchesCat && matchesQuery;
    });
  });

  // Mapa rápido de cantidades en el carrito por productoId
  cartQuantityMap = computed(() => {
    const map: Record<string, number> = {};
    for (const item of this.cart()) {
      map[item.product.id] = item.cantidad;
    }
    return map;
  });

  // Totales de la comanda
  totalArticulos = computed(() =>
    this.cart().reduce((acc, item) => acc + item.cantidad, 0)
  );

  totalComanda = computed(() =>
    this.cart().reduce((acc, item) => acc + Number(item.product.precio) * item.cantidad, 0)
  );

  ngOnInit(): void {
    this.refreshAll();

    // Sincronizar estados de cocina cada 10 segundos
    this.pollingIntervalId = setInterval(() => {
      this.loadOrdenesActivas();
      this.loadMesas();
    }, 10_000);
  }

  ngOnDestroy(): void {
    if (this.pollingIntervalId) {
      clearInterval(this.pollingIntervalId);
    }
  }

  refreshAll(): void {
    this.loadCatalogo();
    this.loadMesas();
    this.loadOrdenesActivas();
  }

  loadCatalogo(): void {
    this.isLoading.set(true);
    this.menuService.getCategorias().subscribe({
      next: (res) => {
        this.categorias.set(res.categorias);
        this.loadProductos();
      },
      error: () => {
        this.showFeedback('No se pudieron cargar las categorías', 'error');
        this.isLoading.set(false);
      }
    });
  }

  loadProductos(): void {
    this.menuService.getProductos().subscribe({
      next: (res) => {
        this.productos.set(res.productos);
        this.isLoading.set(false);
      },
      error: () => {
        this.showFeedback('No se pudieron cargar los productos del menú', 'error');
        this.isLoading.set(false);
      }
    });
  }

  loadMesas(): void {
    this.orderService.getMesas().subscribe({
      next: (res) => this.mesas.set(res.mesas || []),
      error: () => console.warn('No se pudieron cargar las mesas')
    });
  }

  loadOrdenesActivas(): void {
    this.orderService.getOrdenesActivas().subscribe({
      next: (res) => {
        const ordenes = res.ordenes || [];
        this.detectarCambiosEstadoCocina(ordenes);
        this.ordenesActivas.set(ordenes);
      },
      error: () => console.warn('No se pudieron cargar las órdenes activas')
    });
  }

  private detectarCambiosEstadoCocina(ordenes: ActiveOrder[]): void {
    const mapaActual = new Map<string, EstadoCocinaPos>();

    for (const orden of ordenes) {
      mapaActual.set(String(orden.id), this.getEstadoCocinaNormalizado(orden));
    }

    if (this.initialOrdersLoaded) {
      const recienListas: ActiveOrder[] = [];
      const recienIniciadas: ActiveOrder[] = [];

      for (const orden of ordenes) {
        const id = String(orden.id);
        const estadoAnterior = this.previousOrderStates.get(id);
        const estadoActual = mapaActual.get(id);

        if (estadoAnterior && estadoAnterior !== estadoActual) {
          if (estadoActual === 'listo') {
            recienListas.push(orden);
          } else if (estadoActual === 'en_preparacion') {
            recienIniciadas.push(orden);
          }
        }
      }

      if (recienListas.length > 0) {
        const primera = recienListas[0];
        const destino = primera.mesa ? this.getMesaLabel(primera.mesa) : 'Para Llevar';
        const extra = recienListas.length > 1 ? ` (+${recienListas.length - 1} más)` : '';
        this.showFeedback(
          `🔔 ¡Pedido listo en cocina! ${this.formatFolio(primera)} (${destino})${extra}`,
          'success'
        );
        this.reproducirAvisoSonoro();
      } else if (recienIniciadas.length > 0) {
        const primera = recienIniciadas[0];
        const destino = primera.mesa ? this.getMesaLabel(primera.mesa) : 'Para Llevar';
        this.showFeedback(
          `🔥 Cocina inició preparación: ${this.formatFolio(primera)} (${destino})`,
          'warning'
        );
      }
    }

    this.previousOrderStates = mapaActual;
    this.initialOrdersLoaded = true;
  }

  private reproducirAvisoSonoro(): void {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Ignorar si el navegador bloquea audio automático
    }
  }

  getEstadoCocinaNormalizado(orden: ActiveOrder): EstadoCocinaPos {
    const estado = (orden.estado || '').toLowerCase().trim();
    if (estado === 'preparado' || estado === 'listo') return 'listo';
    if (estado === 'en_preparacion') return 'en_preparacion';
    return 'sin_iniciar';
  }

  isOrdenListaParaCobrar(orden: ActiveOrder): boolean {
    return this.getEstadoCocinaNormalizado(orden) === 'listo';
  }

  getEstadoOrdenLabel(orden: ActiveOrder): string {
    const estado = this.getEstadoCocinaNormalizado(orden);
    if (estado === 'listo') return '✅ Listo en Cocina';
    if (estado === 'en_preparacion') return '🔥 En Preparación';
    return '⏳ Sin Iniciar';
  }

  formatFolio(orden: ActiveOrder): string {
    const val = String(orden.folio || orden.id).trim();
    return val.startsWith('#') ? val : `#${val}`;
  }

  openOrdersModal(filtro: FiltroOrdenesPos = 'todas'): void {
    this.ordersFilter.set(filtro);
    this.isOrdersModalOpen.set(true);
    this.loadOrdenesActivas();
  }

  setTipoOrden(tipo: 'comedor' | 'llevar'): void {
    this.tipoOrden.set(tipo);
    if (tipo === 'llevar') {
      this.selectedMesaId.set(null);
    }
  }

  selectMesa(mesa: Mesa): void {
    if (mesa.estado === 'mantenimiento') {
      this.showFeedback(`${this.getMesaLabel(mesa)} está en mantenimiento`, 'warning');
      return;
    }
    this.selectedMesaId.set(mesa.id);
  }

  getMesaLabel(mesa: Mesa): string {
    const val = String(mesa.numeroMesa || mesa.id).trim();
    return /^\d+$/.test(val) ? `Mesa ${val}` : val;
  }

  // ==================== LÓGICA DE CARRITO Y STOCK ====================

  isProductAvailable(prod: Product): boolean {
    return prod.estaDisponible && prod.disponibleParaVenta !== false;
  }

  addToCart(prod: Product): void {
    if (!this.isProductAvailable(prod)) {
      this.showFeedback(`"${prod.nombre}" no está disponible en este momento`, 'warning');
      return;
    }

    const currentQty = this.cartQuantityMap()[prod.id] || 0;
    const maxPorciones = prod.porcionesDisponibles;

    if (maxPorciones !== null && maxPorciones !== undefined && currentQty + 1 > maxPorciones) {
      this.showFeedback(
        `Stock insuficiente: solo alcanzan ${maxPorciones} porciones de "${prod.nombre}"`,
        'warning'
      );
      return;
    }

    if (currentQty > 0) {
      this.cart.update(items =>
        items.map(item =>
          item.product.id === prod.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        )
      );
    } else {
      this.cart.update(items => [
        ...items,
        { product: prod, cantidad: 1, notas: '' }
      ]);
    }
  }

  incrementItem(item: PosCartItem): void {
    this.addToCart(item.product);
  }

  decrementItem(item: PosCartItem): void {
    if (item.cantidad <= 1) {
      this.removeItem(item.product.id);
      return;
    }

    this.cart.update(items =>
      items.map(i =>
        i.product.id === item.product.id
          ? { ...i, cantidad: i.cantidad - 1 }
          : i
      )
    );
  }

  removeItem(productId: string): void {
    this.cart.update(items => items.filter(i => i.product.id !== productId));
  }

  updateItemNotes(productId: string, notas: string): void {
    this.cart.update(items =>
      items.map(i =>
        i.product.id === productId ? { ...i, notas } : i
      )
    );
  }

  clearCart(): void {
    this.cart.set([]);
    this.ordenNotas.set('');
  }

  // ==================== ENVIAR ORDEN AL BACKEND ====================

  submitOrden(): void {
    if (this.cart().length === 0 || this.isSubmitting()) return;

    if (this.tipoOrden() === 'comedor' && !this.selectedMesaId()) {
      this.showFeedback('Selecciona una mesa antes de enviar la comanda', 'warning');
      return;
    }

    const notasItems = this.cart()
      .filter(i => i.notas.trim().length > 0)
      .map(i => `${i.cantidad}x ${i.product.nombre}: ${i.notas.trim()}`);

    const bloquesNotas: string[] = [];
    if (notasItems.length > 0) {
      bloquesNotas.push(notasItems.join(' | '));
    }
    if (this.ordenNotas().trim().length > 0) {
      bloquesNotas.push(this.ordenNotas().trim());
    }

    const payload: CreateOrderPayload = {
      tipoOrden: this.tipoOrden(),
      mesaId: this.tipoOrden() === 'comedor' ? this.selectedMesaId() : null,
      notas: bloquesNotas.length > 0 ? bloquesNotas.join(' — ') : undefined,
      items: this.cart().map(i => ({
        productoId: i.product.id,
        cantidad: i.cantidad
      }))
    };

    this.isSubmitting.set(true);

    this.orderService.createOrden(payload).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.clearCart();
        this.selectedMesaId.set(null);
        this.showFeedback(res.message || 'Comanda enviada a cocina (sin iniciar)', 'success');

        this.loadProductos();
        this.loadMesas();
        this.loadOrdenesActivas();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.showFeedback(
          err.error?.message || 'No se pudo procesar la orden',
          'error'
        );
      }
    });
  }

  // ==================== MÉTODOS DE COBRO Y REIMPRESIÓN ====================

  openCheckoutModal(orden: ActiveOrder): void {
    if (!this.isOrdenListaParaCobrar(orden)) {
      const estado = this.getEstadoCocinaNormalizado(orden);
      this.showFeedback(
        estado === 'en_preparacion'
          ? 'No se puede cobrar aún: el pedido está en preparación en cocina'
          : 'No se puede cobrar aún: el pedido sigue sin iniciar en cocina',
        'warning'
      );
      return;
    }

    this.isOrdersModalOpen.set(false);
    this.paymentReceipt.set(null);
    this.lastPaidOrderId.set(orden.id);
    this.checkoutOrder.set(orden);
    this.pagosDraft.set([
      {
        metodoPago: 'efectivo',
        monto: Number(orden.total),
        idTransaccion: ''
      }
    ]);
  }

  closeCheckoutModal(): void {
    this.checkoutOrder.set(null);
    this.paymentReceipt.set(null);
    this.pagosDraft.set([]);
  }

  addPagoLine(): void {
    const restante = this.restanteCheckout();
    this.pagosDraft.update(list => [
      ...list,
      {
        metodoPago: 'tarjeta',
        monto: restante > 0 ? restante : 0,
        idTransaccion: ''
      }
    ]);
  }

  removePagoLine(index: number): void {
    if (this.pagosDraft().length <= 1) return;
    this.pagosDraft.update(list => list.filter((_, i) => i !== index));
  }

  updatePagoMetodo(index: number, metodoPago: MetodoPago): void {
    this.pagosDraft.update(list =>
      list.map((p, i) =>
        i === index
          ? { ...p, metodoPago, idTransaccion: metodoPago === 'efectivo' ? '' : p.idTransaccion }
          : p
      )
    );
  }

  updatePagoMonto(index: number, monto: number): void {
    this.pagosDraft.update(list =>
      list.map((p, i) => (i === index ? { ...p, monto: Number(monto) } : p))
    );
  }

  updatePagoTransaccion(index: number, idTransaccion: string): void {
    this.pagosDraft.update(list =>
      list.map((p, i) => (i === index ? { ...p, idTransaccion } : p))
    );
  }

  setMontoRapido(monto: number): void {
    if (this.pagosDraft().length === 0) return;
    this.updatePagoMonto(0, monto);
  }

  procesarCobro(): void {
    const orden = this.checkoutOrder();
    if (!orden || this.isProcessingPayment()) return;

    if (!this.isOrdenListaParaCobrar(orden)) {
      this.showFeedback('El pedido aún no ha sido liberado por cocina', 'warning');
      return;
    }

    const pagosLimpios: PagoItemPayload[] = this.pagosDraft().map(p => ({
      metodoPago: p.metodoPago,
      monto: Number(p.monto),
      ...(p.idTransaccion && p.idTransaccion.trim().length > 0
        ? { idTransaccion: p.idTransaccion.trim() }
        : {})
    }));

    if (pagosLimpios.some(p => !Number.isFinite(p.monto) || p.monto <= 0)) {
      this.showFeedback('Todos los montos de pago deben ser mayores a $0.00', 'warning');
      return;
    }

    if (this.totalAbonadoCheckout() < this.totalCheckout()) {
      this.showFeedback(
        `Faltan $${this.restanteCheckout().toFixed(2)} por cubrir`,
        'warning'
      );
      return;
    }

    this.isProcessingPayment.set(true);

    this.paymentService.registrarPago(orden.id, { pagos: pagosLimpios }).subscribe({
      next: (res) => {
        this.isProcessingPayment.set(false);
        this.paymentReceipt.set(res);
        this.showFeedback(res.message, 'success');

        this.loadOrdenesActivas();
        this.loadMesas();
      },
      error: (err) => {
        this.isProcessingPayment.set(false);
        this.showFeedback(
          err.error?.message || 'No se pudo procesar el pago',
          'error'
        );
      }
    });
  }

  reimprimirTicket(ordenId: string | number, tipoTicket: TipoTicketReimpresion): void {
    this.paymentService.solicitarReimpresion(ordenId, tipoTicket).subscribe({
      next: (res) => {
        this.showFeedback(res.message, 'success');
      },
      error: (err) => {
        this.showFeedback(
          err.error?.message || 'No se pudo registrar la impresión del ticket',
          'error'
        );
      }
    });
  }

  showFeedback(msg: string, type: 'success' | 'warning' | 'error'): void {
    this.feedbackMessage.set(msg);
    this.feedbackType.set(type);
    setTimeout(() => {
      if (this.feedbackMessage() === msg) {
        this.feedbackMessage.set('');
      }
    }, 4500);
  }

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}