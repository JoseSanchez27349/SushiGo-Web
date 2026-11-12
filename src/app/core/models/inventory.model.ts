export interface Ingredient {
  id: string;
  nombre: string;
  unidadMedida: string;
  stockActual: number | string;
  stockMinimo: number | string;
  costoUnitario: number | string;
  bajoStock?: boolean;
}

export interface CreateIngredientPayload {
  nombre: string;
  unidadMedida: string;
  stockActual: number;
  stockMinimo: number;
  costoUnitario: number;
}

export interface UpdateIngredientPayload {
  nombre?: string;
  unidadMedida?: string;
  stockActual?: number;
  stockMinimo?: number;
  costoUnitario?: number;
}

export interface RecipeItem {
  id?: string;
  productoId?: string;
  ingredienteId: string;
  cantidadRequerida: number | string;
  ingrediente: Ingredient;
}

export interface ProductRecipeResponse {
  productoId: string;
  nombreProducto: string;
  precioVenta: number | string;
  costoProduccion: number;
  margenEstimado: number;
  receta: RecipeItem[];
}

export interface SaveRecipePayload {
  ingredientes: {
    ingredienteId: string;
    cantidad: number;
  }[];
}