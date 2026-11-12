import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-dashboard.component.html'
})
export class AdminDashboardComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  user = this.authService.currentUser;

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}