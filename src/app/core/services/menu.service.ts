import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Category,
  CreateCategoryPayload,
  UpdateCategoryPayload,
  Product,
  CreateProductPayload,
  UpdateProductPayload
} from '../models/menu.model';

@Injectable({
  providedIn: 'root'
})
export class MenuService {
  private http = inject(HttpClient);

  // Ajusta estos prefijos si en tu routes/index.ts tienen otro nombre
  private categoriasUrl = 'http://localhost:3000/api/v1/categorias';
  private productosUrl = 'http://localhost:3000/api/v1/productos';

  // ==================== CATEGORÍAS ====================

  getCategorias(): Observable<{ categorias: Category[] }> {
    return this.http.get<{ categorias: Category[] }>(this.categoriasUrl);
  }

  createCategoria(payload: CreateCategoryPayload): Observable<{ message: string; categoria: Category }> {
    return this.http.post<{ message: string; categoria: Category }>(this.categoriasUrl, payload);
  }

  updateCategoria(id: number, payload: UpdateCategoryPayload): Observable<{ message: string; categoria: Category }> {
    return this.http.put<{ message: string; categoria: Category }>(`${this.categoriasUrl}/${id}`, payload);
  }

  deleteCategoria(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.categoriasUrl}/${id}`);
  }

  // ==================== PRODUCTOS ====================

  getProductos(categoriaId?: number | null, disponible?: boolean): Observable<{ productos: Product[] }> {
    let params = new HttpParams();
    if (categoriaId) {
      params = params.set('categoriaId', categoriaId.toString());
    }
    if (disponible !== undefined) {
      params = params.set('disponible', disponible.toString());
    }
    return this.http.get<{ productos: Product[] }>(this.productosUrl, { params });
  }

  createProducto(payload: CreateProductPayload): Observable<{ message: string; producto: Product }> {
    return this.http.post<{ message: string; producto: Product }>(this.productosUrl, payload);
  }

  updateProducto(id: string, payload: UpdateProductPayload): Observable<{ message: string; producto: Product }> {
    return this.http.put<{ message: string; producto: Product }>(`${this.productosUrl}/${id}`, payload);
  }

  deleteProducto(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.productosUrl}/${id}`);
  }
}