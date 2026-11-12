import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Ingredient,
  CreateIngredientPayload,
  UpdateIngredientPayload,
  ProductRecipeResponse,
  SaveRecipePayload
} from '../models/inventory.model';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private http = inject(HttpClient);

  private ingredientesUrl = 'http://localhost:3000/api/v1/ingredientes';
  private recetasUrl = 'http://localhost:3000/api/v1/recetas';

  // ==================== INGREDIENTES ====================

  getIngredientes(): Observable<{ ingredientes: Ingredient[] }> {
    return this.http.get<{ ingredientes: Ingredient[] }>(this.ingredientesUrl);
  }

  createIngrediente(payload: CreateIngredientPayload): Observable<{ message: string; ingrediente: Ingredient }> {
    return this.http.post<{ message: string; ingrediente: Ingredient }>(this.ingredientesUrl, payload);
  }

  updateIngrediente(id: string, payload: UpdateIngredientPayload): Observable<{ message: string; ingrediente: Ingredient }> {
    return this.http.put<{ message: string; ingrediente: Ingredient }>(`${this.ingredientesUrl}/${id}`, payload);
  }

  deleteIngrediente(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.ingredientesUrl}/${id}`);
  }
// ==================== RECETAS (BOM) ====================

  getRecetaProducto(productoId: string): Observable<ProductRecipeResponse> {
    return this.http.get<ProductRecipeResponse>(`${this.recetasUrl}/producto/${productoId}`);
  }

  saveRecetaProducto(productoId: string, payload: SaveRecipePayload): Observable<any> {
    return this.http.post<any>(`${this.recetasUrl}/producto/${productoId}`, payload);
  }

  removeIngredienteDeReceta(productoId: string, ingredienteId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.recetasUrl}/producto/${productoId}/ingrediente/${ingredienteId}`
    );
  }
}