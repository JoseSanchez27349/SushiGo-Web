export type MetodoPago = 'efectivo' | 'tarjeta' | 'transferencia';
export type TipoTicketReimpresion = 'precuenta' | 'ticket_final' | 'cocina';

export interface PagoItemPayload {
  metodoPago: MetodoPago;
  monto: number;
  idTransaccion?: string;
}

export interface RegistrarPagoPayload {
  pagos: PagoItemPayload[];
}

export interface PagoRegistrado {
  id: string;
  ordenId: string;
  metodoPago: MetodoPago;
  monto: number | string;
  estado: string;
  idTransaccion?: string | null;
  pagadoEn: string;
}

export interface RegistrarPagoResponse {
  message: string;
  folio: string | number;
  totalOrden: number;
  montoAbonado: number;
  cambio: number;
  puntosAcumulados: number;
  detallesPago: PagoRegistrado[];
}

export interface ReimpresionResponse {
  message: string;
  auditoriaId: string | number;
  ticketData: {
    folio: string | number;
    tipoOrden: string;
    mesa: string;
    total: number | string;
    detalles: {
      cantidad: number;
      precioUnitario: number | string;
      subtotal: number | string;
      producto: { nombre: string };
    }[];
    pagos: PagoRegistrado[];
    reimpresoEn: string;
  };
}