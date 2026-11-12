export interface StaffUser {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  codigoEmpleado: string;
  estaActivo: boolean;
  rol: {
    nombre: 'Mesero' | 'Cocina';
  };
  creadoEn?: string;
  actualizadoEn?: string;
}

export interface CreateStaffPayload {
  nombre: string;
  apellido: string;
  telefono: string;
  codigoEmpleado: string;
  pin: string;
  rolNombre: 'Mesero' | 'Cocina';
}

export interface UpdateStaffPayload {
  nombre?: string;
  apellido?: string;
  telefono?: string;
  codigoEmpleado?: string;
  pin?: string;
  rolNombre?: 'Mesero' | 'Cocina';
  estaActivo?: boolean;
}

export interface StaffListResponse {
  usuarios: StaffUser[];
}

export interface SingleStaffResponse {
  message: string;
  usuario: StaffUser;
}