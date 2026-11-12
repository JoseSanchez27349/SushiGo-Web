export interface MesaOrdenResumen {
  id: number | string;
  folio?: string;
  estado: string;
  subtotal: number | string;
  total: number | string;
  creadoEn: string;
}

export interface Mesa {
  id: number;
  numeroMesa: string;
  capacidad: number;
  estado: 'disponible' | 'ocupada' | 'reservada' | 'mantenimiento' | string;
  ordenes?: MesaOrdenResumen[];
}

export interface CreateOrderItemPayload {
  productoId: string;
  cantidad: number;
}

export interface CreateOrderPayload {
  tipoOrden: 'comedor' | 'llevar';
  mesaId?: number | null;
  notas?: string;
  items: CreateOrderItemPayload[];
}

export interface OrderDetailItem {
  id?: number;
  productoId: string;
  cantidad: number;
  precioUnitario: number | string;
  subtotal: number | string;
  producto: {
    id: string;
    nombre: string;
  };
}

export interface ActiveOrder {
  id: number | string;
  folio?: string;
  tipoOrden: string;
  mesaId?: number | null;
  estado: string;
  subtotal: number | string;
  total: number | string;
  notas?: string | null;
  creadoEn: string;
  mesa?: Mesa | null;
  mesero?: {
    id: string;
    nombre: string;
    apellido?: string;
  } | null;
  detalles: OrderDetailItem[];
  tiemposCocina?: {
    estadoCocina: string;
    tiempoEstimadoMinutos: number;
  }[];
}