// Payload para /login-staff
export interface EmployeeLoginPayload {
  codigoEmpleado: string;
  pin: string;
}

// Payload para /login-admin
export interface AdminLoginPayload {
  correoElectronico: string;
  password: string;
}

// Usuario devuelto por la API
export interface AuthUser {
  id: string;
  nombre: string;
  codigoEmpleado?: string;
  correoElectronico?: string;
  role: 'Admin' | 'Cocina' | 'Mesero';
}

// Respuesta exitosa del backend
export interface AuthResponse {
  message: string;
  token: string;
  user: AuthUser;
}