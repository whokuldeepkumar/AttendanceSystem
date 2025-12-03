import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

type CardVariant = 'default' | 'primary' | 'success' | 'warning' | 'error';
type CardSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [ngClass]="['card', 'card-' + variant, 'card-' + size]">
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    .card {
      background: var(--glass-bg);
      backdrop-filter: blur(20px);
      border-radius: 16px;
      border: 1px solid var(--glass-border);
      transition: all 0.3s ease;
    }

    .card-default {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .card-primary {
      border-color: rgba(99, 102, 241, 0.3);
      background: rgba(99, 102, 241, 0.05);
    }

    .card-success {
      border-color: rgba(34, 197, 94, 0.3);
      background: rgba(34, 197, 94, 0.05);
    }

    .card-warning {
      border-color: rgba(251, 146, 60, 0.3);
      background: rgba(251, 146, 60, 0.05);
    }

    .card-error {
      border-color: rgba(239, 68, 68, 0.3);
      background: rgba(239, 68, 68, 0.05);
    }

    .card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
    }

    .card-sm {
      padding: 12px;
    }

    .card-md {
      padding: 20px;
    }

    .card-lg {
      padding: 28px;
    }
  `]
})
export class CardComponent {
  @Input() variant: CardVariant = 'default';
  @Input() size: CardSize = 'md';
}
