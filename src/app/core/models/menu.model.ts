export interface Category {
  id: number;
  nombre: string;
  slug: string;
  descripcion?: string | null;
  estaActiva: boolean;
  _count?: {
    productos: number;
  };
}

export interface CreateCategoryPayload {
  nombre: string;
  descripcion?: string;
}

export interface UpdateCategoryPayload {
  nombre?: string;
  descripcion?: string;
  estaActiva?: boolean;
}

export interface Product {
  id: string;
  categoriaId: number;
  nombre: string;
  descripcion?: string | null;
  precio: number | string;
  urlImagen?: string | null;
  estaDisponible: boolean;
  porcionesDisponibles?: number | null;
  disponibleParaVenta?: boolean;
  categoria: {
    id: number;
    nombre: string;
    slug: string;
  };
  creadoEn?: string;
}

export interface CreateProductPayload {
  categoriaId: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  urlImagen?: string;
  estaDisponible?: boolean;
}

export interface UpdateProductPayload {
  categoriaId?: number;
  nombre?: string;
  descripcion?: string;
  precio?: number;
  urlImagen?: string;
  estaDisponible?: boolean;
}