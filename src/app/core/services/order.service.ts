import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ActiveOrder, CreateOrderPayload, Mesa } from '../models/order.model';

export interface AddOrderItemsPayload {
  items: {
    productoId: string;
    cantidad: number;
  }[];
  notas?: string;
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:3000/api/v1';

  getMesas(): Observable<{ mesas: Mesa[] }> {
    return this.http.get<{ mesas: Mesa[] }>(`${this.baseUrl}/mesas`);
  }

  getOrdenesActivas(): Observable<{ ordenes: ActiveOrder[] }> {
    return this.http.get<{ ordenes: ActiveOrder[] }>(`${this.baseUrl}/ordenes/activas`);
  }

  createOrden(payload: CreateOrderPayload): Observable<{ message: string; orden: ActiveOrder }> {
    return this.http.post<{ message: string; orden: ActiveOrder }>(
      `${this.baseUrl}/ordenes`,
      payload
    );
  }

  agregarItemsOrden(
    ordenId: string | number,
    payload: AddOrderItemsPayload
  ): Observable<{ message: string; orden: ActiveOrder }> {
    return this.http.post<{ message: string; orden: ActiveOrder }>(
      `${this.baseUrl}/ordenes/${ordenId}/items`,
      payload
    );
  }

  cancelarOrden(
    ordenId: string | number,
    motivo?: string
  ): Observable<{ message: string; orden: ActiveOrder }> {
    return this.http.put<{ message: string; orden: ActiveOrder }>(
      `${this.baseUrl}/ordenes/${ordenId}/cancelar`,
      { motivo }
    );
  }
}