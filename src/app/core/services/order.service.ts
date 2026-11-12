import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ActiveOrder, CreateOrderPayload, Mesa } from '../models/order.model';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private http = inject(HttpClient);
  private ordenesUrl = 'http://localhost:3000/api/v1/ordenes';
  private mesasUrl = 'http://localhost:3000/api/v1/mesas';

  getMesas(): Observable<{ mesas: Mesa[] }> {
    return this.http.get<{ mesas: Mesa[] }>(this.mesasUrl);
  }

  createOrden(payload: CreateOrderPayload): Observable<{ message: string; orden: ActiveOrder }> {
    return this.http.post<{ message: string; orden: ActiveOrder }>(this.ordenesUrl, payload);
  }

  getOrdenesActivas(): Observable<{ ordenes: ActiveOrder[] }> {
    return this.http.get<{ ordenes: ActiveOrder[] }>(`${this.ordenesUrl}/activas`);
  }
}