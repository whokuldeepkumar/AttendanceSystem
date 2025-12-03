import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="isOpen" class="modal-overlay" (click)="onBackdropClick()">
      <div class="modal-dialog" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>{{ title }}</h2>
          <button class="modal-close" (click)="cancel()" aria-label="Close">×</button>
        </div>
        <div class="modal-body">
          <p>{{ message }}</p>
          <ng-content></ng-content>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="cancel()">{{ cancelText }}</button>
          <button class="btn btn-primary" (click)="confirm()">{{ confirmText }}</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.2s ease-out;
    }

    .modal-dialog {
      background: var(--glass-bg);
      backdrop-filter: blur(20px);
      border-radius: 16px;
      border: 1px solid var(--glass-border);
      min-width: 300px;
      max-width: 500px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: slideUp 0.3s ease-out;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid var(--glass-border);
    }

    .modal-header h2 {
      margin: 0;
      font-size: 20px;
      color: var(--text-color);
    }

    .modal-close {
      background: none;
      border: none;
      color: var(--text-color);
      font-size: 32px;
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.7;
      transition: opacity 0.2s;
    }

    .modal-close:hover {
      opacity: 1;
    }

    .modal-body {
      padding: 20px;
      color: var(--text-color);
      line-height: 1.6;
    }

    .modal-body p {
      margin: 0 0 15px 0;
      font-size: 16px;
    }

    .modal-footer {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      padding: 20px;
      border-top: 1px solid var(--glass-border);
    }

    .modal-footer .btn {
      padding: 10px 20px;
      min-width: 100px;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (max-width: 480px) {
      .modal-dialog {
        width: 95%;
        max-width: 100%;
      }

      .modal-footer {
        flex-direction: column;
      }

      .modal-footer .btn {
        width: 100%;
      }
    }
  `]
})
export class ModalComponent {
  @Input() isOpen = false;
  @Input() title = 'Confirm';
  @Input() message = '';
  @Input() confirmText = 'Confirm';
  @Input() cancelText = 'Cancel';
  @Input() closeOnBackdrop = true;

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  confirm() {
    this.confirmed.emit();
    this.isOpen = false;
  }

  cancel() {
    this.cancelled.emit();
    this.isOpen = false;
  }

  onBackdropClick() {
    if (this.closeOnBackdrop) {
      this.cancel();
    }
  }
}
