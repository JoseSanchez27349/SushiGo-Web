export type EstadoCocina = 'en_espera' | 'en_preparacion' | 'listo';
export type NivelAlertaCocina = 'normal' | 'advertencia' | 'critico';

export interface ContadorEnVivo {
  minutosTranscurridos: number;
  minutosRestantes: number;
  tiempoEstimadoMinutos: number;
  estaRetrasada: boolean;
  nivelAlerta: NivelAlertaCocina;
}

export interface KitchenOrderItem {
  id: string;
  cantidad: number;
  estadoCocina: EstadoCocina;
  ronda: number;
  creadoEn?: string;
  inicioPreparacionEn?: string | null;
  listoEn?: string | null;
  producto: {
    id?: string;
    nombre: string;
  };
}

export interface KitchenComanda {
  id: string;
  ordenId: string;
  cocineroId?: string | null;
  estadoCocina: EstadoCocina;
  tiempoEstimadoMinutos: number;
  inicioPreparacionEn: string | null;
  listoEn: string | null;
  creadoEn: string;
  cocinero?: {
    id: string;
    nombre: string;
    apellido?: string;
  } | null;
  orden: {
    id: string;
    folio: string | number;
    tipoOrden: 'comedor' | 'llevar' | string;
    notas?: string | null;
    creadoEn?: string;
    mesa?: {
      id: number;
      numeroMesa: string;
    } | null;
    detalles: KitchenOrderItem[];
  };
  contadorEnVivo: ContadorEnVivo;
}