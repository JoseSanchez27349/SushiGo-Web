import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  RegistrarPagoPayload,
  RegistrarPagoResponse,
  ReimpresionResponse,
  TipoTicketReimpresion
} from '../models/payment.model';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/v1/pagos';

  registrarPago(ordenId: string | number, payload: RegistrarPagoPayload): Observable<RegistrarPagoResponse> {
    return this.http.post<RegistrarPagoResponse>(`${this.apiUrl}/orden/${ordenId}`, payload);
  }

  solicitarReimpresion(ordenId: string | number, tipoTicket: TipoTicketReimpresion): Observable<ReimpresionResponse> {
    return this.http.post<ReimpresionResponse>(`${this.apiUrl}/orden/${ordenId}/reimpresion`, { tipoTicket });
  }

  obtenerDetallePago(ordenId: string | number): Observable<{ orden: unknown }> {
    return this.http.get<{ orden: unknown }>(`${this.apiUrl}/orden/${ordenId}`);
  }
}