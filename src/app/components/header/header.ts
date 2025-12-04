import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ThemeService } from '../../services/theme.service';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="app-header">
      <div class="header-content">
        <div class="header-brand">
          <span class="brand-icon">📋</span>
          <h1 class="brand-name">Attendance</h1>
        </div>
        <div class="header-actions">
          <div class="user-info" *ngIf="currentUser()">
            <div class="user-details">
              <span class="user-name">{{ currentUser()?.name }}</span>
              <span class="user-mobile">{{ currentUser()?.mobile }}</span>
            </div>
          </div>
          <button class="theme-toggle" (click)="toggleTheme()" [title]="'Switch to ' + (isDark() ? 'light' : 'dark') + ' mode'">
            <span class="theme-icon">{{ isDark() ? '☀️' : '🌙' }}</span>
          </button>
          <button class="logout-btn" (click)="logout()" *ngIf="currentUser()" title="Logout">
            <span class="logout-icon">🚪</span>
          </button>
        </div>
      </div>
    </header>
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

    .brand-icon {
      font-size: 28px;
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

    .theme-icon {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    @media (max-width: 768px) {
      .header-content {
        padding: 10px 16px;
      }

      .brand-icon {
        font-size: 24px;
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
      .logout-btn {
        width: 40px;
        height: 40px;
        font-size: 18px;
      }
    }

    @media (max-width: 480px) {
      .header-actions {
        gap: 8px;
      }

      .user-details {
        display: none;
      }

      .user-info {
        padding: 8px;
      }
    }
  `]
})
export class HeaderComponent {
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
    this.authService.logout();
    this.toastService.success('Logged out successfully');
    this.router.navigate(['/login']);
  }
}
