import { Injectable, ErrorHandler } from '@angular/core';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root'
})
export class GlobalErrorHandler implements ErrorHandler {
  constructor(private toastService: ToastService) {}

  handleError(error: any): void {
    console.error('Global error:', error);
    
    const message = error?.message || 'An unexpected error occurred';
    this.toastService.error(message);
  }
}
