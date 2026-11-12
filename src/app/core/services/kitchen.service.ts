import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ContadorEnVivo, EstadoCocina, KitchenComanda } from '../models/kitchen.model';

@Injectable({
  providedIn: 'root'
})
export class KitchenService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/v1/cocina';

  getComandas(): Observable<{ comandas: KitchenComanda[] }> {
    return this.http.get<{ comandas: KitchenComanda[] }>(`${this.apiUrl}/comandas`);
  }

  cambiarEstado(
    ordenId: string,
    estadoCocina: EstadoCocina
  ): Observable<{ message: string; cocina: KitchenComanda; contadorEnVivo: ContadorEnVivo }> {
    return this.http.put<{ message: string; cocina: KitchenComanda; contadorEnVivo: ContadorEnVivo }>(
      `${this.apiUrl}/comandas/${ordenId}/estado`,
      { estadoCocina }
    );
  }
}