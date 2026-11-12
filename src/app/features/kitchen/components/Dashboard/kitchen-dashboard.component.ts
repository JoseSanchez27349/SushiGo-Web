import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-kitchen-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kitchen-dashboard.component.html'
})
export class KitchenDashboardComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  user = this.authService.currentUser;

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}