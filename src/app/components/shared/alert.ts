import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

@Component({
  selector: 'app-alert',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [ngClass]="['alert', 'alert-' + variant]">
      <span class="alert-icon">{{ getIcon() }}</span>
      <div class="alert-content">
        <strong *ngIf="title">{{ title }}</strong>
        <p>{{ message }}</p>
      </div>
    </div>
  `,
  styles: [`
    .alert {
      display: flex;
      gap: 12px;
      padding: 16px;
      border-radius: 12px;
      border: 1px solid;
      color: var(--text-color);
      margin-bottom: 16px;
    }

    .alert-info {
      background: rgba(59, 130, 246, 0.1);
      border-color: rgba(59, 130, 246, 0.3);
    }

    .alert-success {
      background: rgba(34, 197, 94, 0.1);
      border-color: rgba(34, 197, 94, 0.3);
    }

    .alert-warning {
      background: rgba(251, 146, 60, 0.1);
      border-color: rgba(251, 146, 60, 0.3);
    }

    .alert-error {
      background: rgba(239, 68, 68, 0.1);
      border-color: rgba(239, 68, 68, 0.3);
    }

    .alert-icon {
      font-size: 20px;
      flex-shrink: 0;
    }

    .alert-content {
      flex: 1;
    }

    .alert-content strong {
      display: block;
      margin-bottom: 4px;
    }

    .alert-content p {
      margin: 0;
      font-size: 14px;
      color: var(--text-muted);
    }
  `]
})
export class AlertComponent {
  @Input() variant: AlertVariant = 'info';
  @Input() title = '';
  @Input() message = '';

  getIcon(): string {
    const icons: Record<AlertVariant, string> = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };
    return icons[this.variant];
  }
}
