import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

type ButtonVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg' | 'block';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [ngClass]="['btn', 'btn-' + variant, 'btn-' + size]"
      [disabled]="disabled"
      (click)="click.emit()"
    >
      <ng-content></ng-content>
    </button>
  `,
  styles: [`
    .btn {
      padding: 10px 20px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 14px;
      backdrop-filter: blur(10px);
    }

    .btn-primary {
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.8), rgba(79, 70, 229, 0.8));
      color: white;
      box-shadow: 0 8px 25px rgba(99, 102, 241, 0.4);
    }

    .btn-primary:hover:not(:disabled) {
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.9), rgba(79, 70, 229, 0.9));
      transform: translateY(-2px);
    }

    .btn-secondary {
      background: linear-gradient(135deg, rgba(236, 72, 153, 0.8), rgba(219, 39, 119, 0.8));
      color: white;
    }

    .btn-secondary:hover:not(:disabled) {
      transform: translateY(-2px);
    }

    .btn-success {
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.8), rgba(5, 150, 105, 0.8));
      color: white;
    }

    .btn-ghost {
      background: transparent;
      color: var(--text-color);
      border-color: var(--glass-border);
    }

    .btn-ghost:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.1);
    }

    .btn-sm {
      padding: 6px 12px;
      font-size: 12px;
    }

    .btn-lg {
      padding: 14px 32px;
      font-size: 16px;
    }

    .btn-block {
      width: 100%;
      display: block;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none !important;
    }
  `]
})
export class ButtonComponent {
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'md';
  @Input() disabled = false;
  @Output() click = new EventEmitter<void>();
}
