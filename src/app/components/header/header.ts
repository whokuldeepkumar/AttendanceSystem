import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../services/theme.service';
import { ToastService } from '../../services/toast.service';

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
        <button class="theme-toggle" (click)="toggleTheme()" [title]="'Switch to ' + (isDark() ? 'light' : 'dark') + ' mode'">
          <span class="theme-icon">{{ isDark() ? '☀️' : '🌙' }}</span>
        </button>
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
      background: linear-gradient(135deg, #ffffff, #e0e7ff);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .theme-toggle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: rgba(99, 102, 241, 0.2);
      border: 1px solid rgba(99, 102, 241, 0.3);
      color: var(--text-color);
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 20px;
    }

    .theme-toggle:hover {
      background: rgba(99, 102, 241, 0.4);
      transform: scale(1.08);
      box-shadow: 0 0 12px rgba(99, 102, 241, 0.3);
    }

    .theme-icon {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    @media (max-width: 600px) {
      .header-content {
        padding: 10px 16px;
      }

      .brand-icon {
        font-size: 24px;
      }

      .brand-name {
        font-size: 18px;
      }

      .theme-toggle {
        width: 40px;
        height: 40px;
        font-size: 18px;
      }
    }
  `]
})
export class HeaderComponent {
  constructor(
    private themeService: ThemeService,
    private toastService: ToastService
  ) {}

  isDark() {
    return this.themeService.isDark();
  }

  toggleTheme() {
    this.themeService.toggleTheme();
    this.toastService.info(`Switched to ${this.themeService.isDark() ? 'dark' : 'light'} mode`);
  }
}
