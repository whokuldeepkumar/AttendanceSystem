import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ThemeService } from '../../services/theme.service';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';

import { ModalComponent } from '../modal/modal';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, ModalComponent],
  template: `
    <header class="app-header">
      <div class="header-content">
        <div class="header-brand" (click)="goToHome()">
          <img src="/TimeTrack.png" alt="Time Track" class="brand-logo" />
          <h1 class="brand-name">Time Track</h1>
        </div>
        <div class="header-actions">
          <div class="user-info" *ngIf="currentUser()">
            <div class="user-details">
              <span class="user-name">{{ currentUser()?.name }}</span>
              <span class="user-mobile">{{ currentUser()?.mobile }}</span>
            </div>
          </div>
          <button class="theme-toggle" (click)="toggleTheme()" [title]="'Switch to ' + (isDark() ? 'light' : 'dark') + ' mode'">
            <span class="theme-icon">{{ isDark() ? '🌞' : '🌜' }}</span>
          </button>
          <!-- <button class="employee-btn" (click)="goToEmployees()" *ngIf="currentUser()" title="Manage Employees">
            <span class="employee-icon">👥</span>
          </button> -->
          <button class="logout-btn" (click)="showLogoutModal = true" *ngIf="currentUser()" title="Logout">
            <span class="logout-icon">🔓</span>
          </button>
        </div>
      </div>
    </header>

    <app-modal
      [isOpen]="showLogoutModal"
      title="Confirm Logout"
      message="Are you sure you want to logout from Time Track?"
      confirmText="Logout"
      cancelText="Cancel"
      (confirmed)="logout()"
      (cancelled)="showLogoutModal = false"
    ></app-modal>
  `,
  styles: [`
    .app-header {
      background: var(--glass-bg);
      backdrop-filter: blur(20px);
      border-bottom: 1px solid var(--glass-border);
      padding: 0;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .header-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 12px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      text-decoration: none;
      cursor: pointer;
    }

    .brand-logo {
      height: 50px;
      width: 50px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid var(--primary-color);
      box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
    }

    .brand-name {
      font-size: 22px;
      font-weight: 700;
      margin: 0;
      color: var(--text-color);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: var(--bg-secondary);
      border-radius: 10px;
      border: 1px solid var(--glass-border);
    }

    .user-details {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }

    .user-name {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-color);
    }

    .user-mobile {
      font-size: 12px;
      color: var(--text-muted);
    }

    .theme-toggle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: var(--primary-color);
      border: none;
      color: white;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 20px;
    }

    .theme-toggle:hover {
      background: var(--primary-hover);
      transform: scale(1.05);
    }

    .logout-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: #ef4444;
      border: none;
      color: white;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 20px;
    }

    .logout-btn:hover {
      background: #dc2626;
      transform: scale(1.05);
    }

    .employee-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: #10b981;
      border: none;
      color: white;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 20px;
    }

    .employee-btn:hover {
      background: #059669;
      transform: scale(1.05);
    }

    .theme-icon {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    @media (max-width: 768px) {
      .header-content {
        padding: 10px 16px;
      }

      .brand-logo {
        height: 44px;
        width: 44px;
      }

      .brand-name {
        font-size: 18px;
      }

      .user-info {
        padding: 6px 10px;
      }

      .user-name {
        font-size: 13px;
      }

      .user-mobile {
        font-size: 11px;
      }

      .theme-toggle,
      .logout-btn,
      .employee-btn {
        width: 40px;
        height: 40px;
        font-size: 18px;
      }
    }

    @media (max-width: 480px) {
      .header-content {
        padding: 8px 12px;
      }

      .brand-logo {
        height: 36px;
        width: 36px;
      }

      .brand-name {
        font-size: 16px;
      }

      .header-actions {
        gap: 6px;
      }

      .user-info {
        display: none;
      }

      .theme-toggle,
      .logout-btn,
      .employee-btn {
        width: 36px;
        height: 36px;
        font-size: 16px;
      }
    }
  `]
})
export class HeaderComponent {
  showLogoutModal = false;

  constructor(
    private themeService: ThemeService,
    private toastService: ToastService,
    private authService: AuthService,
    private router: Router
  ) {}

  currentUser() {
    return this.authService.currentUser();
  }

  isDark() {
    return this.themeService.isDark();
  }

  toggleTheme() {
    this.themeService.toggleTheme();
    this.toastService.info(`Switched to ${this.themeService.isDark() ? 'dark' : 'light'} mode`);
  }

  logout() {
    this.showLogoutModal = false;
    this.authService.logout();
    this.toastService.success('Logged out successfully');
    this.router.navigate(['/login']);
  }

  goToEmployees() {
    this.router.navigate(['/employees']);
  }

  goToHome() {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/home']);
    } else {
      this.router.navigate(['/login']);
    }
  }
}
