import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { ModalComponent } from '../modal/modal';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {
  name = signal('');
  mobile = signal('');
  isLoading = signal(false);
  errors = signal<{ [key: string]: string }>({});
  showRegisterModal = signal(false);
  pendingName = signal('');
  pendingMobile = signal('');

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService
  ) {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/home']);
    }
  }

  validateForm(): boolean {
    const newErrors: { [key: string]: string } = {};

    if (!this.name().trim()) {
      newErrors['name'] = 'Name is required';
    } else if (this.name().trim().length < 2) {
      newErrors['name'] = 'Name must be at least 2 characters';
    }

    if (!this.mobile().trim()) {
      newErrors['mobile'] = 'Mobile number is required';
    } else if (!/^\d{10}$/.test(this.mobile().replace(/\D/g, ''))) {
      newErrors['mobile'] = 'Mobile number must be 10 digits';
    }

    this.errors.set(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  login() {
    if (!this.validateForm()) {
      this.toastService.error('Please fix the errors in the form');
      return;
    }

    this.isLoading.set(true);

    try {
      const result = this.authService.login(this.name(), this.mobile());
      
      if (result.success) {
        this.toastService.success(result.message);
        setTimeout(() => {
          this.router.navigate(['/home']);
        }, 500);
      } else {
        // User not found - show registration modal
        this.pendingName.set(this.name());
        this.pendingMobile.set(this.mobile());
        this.showRegisterModal.set(true);
      }
    } catch (error) {
      this.toastService.error('Login failed. Please try again.');
      console.error('Login error:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async registerNewUser() {
    this.isLoading.set(true);

    try {
      const result = await this.authService.registerUser(this.pendingName(), this.pendingMobile());
      
      if (result.success) {
        this.toastService.success('User registered successfully! Please login with your credentials.');
        this.showRegisterModal.set(false);
        
        // Clear form and prepare for login
        this.name.set('');
        this.mobile.set('');
        this.pendingName.set('');
        this.pendingMobile.set('');
        this.errors.set({});
      } else {
        this.toastService.error(result.message);
      }
    } catch (error) {
      this.toastService.error('Registration failed. Please try again.');
      console.error('Registration error:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  retryLogin() {
    this.showRegisterModal.set(false);
    // Form values remain the same for user to edit
  }
}
