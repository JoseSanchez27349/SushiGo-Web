export type EstadoCocina = 'en_espera' | 'en_preparacion' | 'listo';
export type NivelAlertaCocina = 'normal' | 'advertencia' | 'critico';

export interface ContadorEnVivo {
  minutosTranscurridos: number;
  minutosRestantes: number;
  tiempoEstimadoMinutos: number;
  estaRetrasada: boolean;
  nivelAlerta: NivelAlertaCocina;
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
    mesa?: {
      id: number;
      numeroMesa: string;
    } | null;
    detalles: {
      id?: string;
      cantidad: number;
      producto: {
        id?: string;
        nombre: string;
      };
    }[];
  };
  contadorEnVivo: ContadorEnVivo;
}