import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-dashboard.component.html'
})
export class AdminDashboardComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  user = this.authService.currentUser;
  isDropdownOpen = signal<boolean>(false);

  toggleDropdown(): void {
    this.isDropdownOpen.update(v => !v);
  }

  closeDropdown(): void {
    this.isDropdownOpen.set(false);
  }

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}