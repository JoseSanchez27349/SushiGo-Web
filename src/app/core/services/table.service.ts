import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Mesa } from '../models/order.model';

export interface CreateMesaPayload {
  numeroMesa: string;
  capacidad: number;
}

export type EstadoMesa = 'disponible' | 'ocupada' | 'reservada' | 'mantenimiento';

@Injectable({
  providedIn: 'root'
})
export class TableService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/v1/mesas';

  getMesas(): Observable<{ mesas: Mesa[] }> {
    return this.http.get<{ mesas: Mesa[] }>(this.apiUrl);
  }

  createMesa(payload: CreateMesaPayload): Observable<{ message: string; mesa: Mesa }> {
    return this.http.post<{ message: string; mesa: Mesa }>(this.apiUrl, payload);
  }

  cambiarEstadoMesa(id: number, estado: EstadoMesa): Observable<{ message: string; mesa: Mesa }> {
    return this.http.put<{ message: string; mesa: Mesa }>(`${this.apiUrl}/${id}/estado`, { estado });
  }
}