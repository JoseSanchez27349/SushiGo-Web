import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { AuthResponse, AdminLoginPayload, EmployeeLoginPayload, AuthUser } from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/v1/auth'; // Asegúrate de ajustar el puerto/host si es necesario

  currentUser = signal<AuthUser | null>(this.getStoredUser());
  token = signal<string | null>(localStorage.getItem('sushigo_token'));

  // POST /login-staff
  loginEmployee(payload: EmployeeLoginPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login-staff`, payload).pipe(
      tap(response => this.saveSession(response))
    );
  }

  // POST /login-admin
  loginAdmin(payload: AdminLoginPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login-admin`, payload).pipe(
      tap(response => this.saveSession(response))
    );
  }

  logout(): void {
    localStorage.removeItem('sushigo_token');
    localStorage.removeItem('sushigo_user');
    this.currentUser.set(null);
    this.token.set(null);
  }

  private saveSession(response: AuthResponse): void {
    localStorage.setItem('sushigo_token', response.token);
    localStorage.setItem('sushigo_user', JSON.stringify(response.user));
    this.token.set(response.token);
    this.currentUser.set(response.user);
  }

  private getStoredUser(): AuthUser | null {
    const user = localStorage.getItem('sushigo_user');
    return user ? JSON.parse(user) : null;
  }
}