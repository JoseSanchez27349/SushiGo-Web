import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  StaffListResponse,
  SingleStaffResponse,
  CreateStaffPayload,
  UpdateStaffPayload
} from '../models/staff.model';

@Injectable({
  providedIn: 'root'
})
export class StaffService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/v1/usuarios/staff';

  // GET /staff
  getStaff(): Observable<StaffListResponse> {
    return this.http.get<StaffListResponse>(this.apiUrl);
  }

  // POST /staff
  createStaff(payload: CreateStaffPayload): Observable<SingleStaffResponse> {
    return this.http.post<SingleStaffResponse>(this.apiUrl, payload);
  }

  // PUT /staff/:id
  updateStaff(id: string, payload: UpdateStaffPayload): Observable<SingleStaffResponse> {
    return this.http.put<SingleStaffResponse>(`${this.apiUrl}/${id}`, payload);
  }

  // DELETE /staff/:id
  deleteStaff(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }
}