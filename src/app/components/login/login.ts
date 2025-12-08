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
  mobile = signal('');
  password = signal('');
  isLoading = signal(false);
  errors = signal<{ [key: string]: string }>({});
  showRegisterModal = signal(false);
  pendingName = signal('');
  pendingMobile = signal('');
  pendingPassword = signal('');

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

    if (!this.mobile().trim()) {
      newErrors['mobile'] = 'Mobile number is required';
    } else if (!/^\d{10}$/.test(this.mobile().replace(/\D/g, ''))) {
      newErrors['mobile'] = 'Mobile number must be 10 digits';
    }

    if (!this.password().trim()) {
      newErrors['password'] = 'Password is required';
    } else if (this.password().trim().length < 4) {
      newErrors['password'] = 'Password must be at least 4 characters';
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
      const result = this.authService.login(this.mobile(), this.password());
      
      if (result.success) {
        this.toastService.success(result.message);
        setTimeout(() => {
          this.router.navigate(['/home']);
        }, 500);
      } else {
        this.toastService.error(result.message);
      }
    } catch (error) {
      this.toastService.error('Login failed. Please try again.');
      console.error('Login error:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  openRegisterModal() {
    this.pendingName.set('');
    this.pendingMobile.set('');
    this.pendingPassword.set('');
    this.showRegisterModal.set(true);
  }

  async registerNewUser() {
    if (!this.pendingName().trim() || !this.pendingMobile().trim() || !this.pendingPassword().trim()) {
      this.toastService.error('Please fill all fields');
      return;
    }

    // Validate against spam/temporary names
    const name = this.pendingName().trim().toLowerCase();
    const blockedNames = ['admin', 'user', 'test', 'demo', 'sample', 'temp', 'temporary', 'guest', 'example', 'dummy', 'fake', 'spam'];
    if (blockedNames.some(blocked => name.includes(blocked))) {
      this.toastService.error('Please use your real name for registration');
      return;
    }

    // Validate mobile number format
    const mobile = this.pendingMobile().replace(/\D/g, '');
    if (!/^\d{10}$/.test(mobile)) {
      this.toastService.error('Mobile number must be 10 digits');
      return;
    }

    // Check for sequential numbers (e.g., 1234567890, 0123456789)
    if (this.hasSequentialDigits(mobile)) {
      this.toastService.error('Please enter a valid mobile number');
      return;
    }

    // Check for repeated digits (e.g., 1111111111, 9999999999)
    if (/^(\d)\1{9}$/.test(mobile)) {
      this.toastService.error('Please enter a valid mobile number');
      return;
    }

    if (this.pendingPassword().length < 4) {
      this.toastService.error('Password must be at least 4 characters');
      return;
    }

    this.isLoading.set(true);

    try {
      const result = await this.authService.registerUser(
        this.pendingName(),
        this.pendingMobile(),
        this.pendingPassword()
      );
      
      if (result.success) {
        this.toastService.success('User registered successfully! Please login with your credentials.');
        this.showRegisterModal.set(false);
        
        // Clear form
        this.mobile.set('');
        this.password.set('');
        this.pendingName.set('');
        this.pendingMobile.set('');
        this.pendingPassword.set('');
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

  hasSequentialDigits(mobile: string): boolean {
    // Check for ascending sequence (e.g., 0123456789, 1234567890)
    let ascendingCount = 0;
    let descendingCount = 0;
    
    for (let i = 0; i < mobile.length - 1; i++) {
      const current = parseInt(mobile[i]);
      const next = parseInt(mobile[i + 1]);
      
      // Check ascending (including wrap around 9->0)
      if ((next === current + 1) || (current === 9 && next === 0)) {
        ascendingCount++;
      } else {
        ascendingCount = 0;
      }
      
      // Check descending (including wrap around 0->9)
      if ((next === current - 1) || (current === 0 && next === 9)) {
        descendingCount++;
      } else {
        descendingCount = 0;
      }
      
      // If 6 or more consecutive sequential digits found, it's likely spam
      if (ascendingCount >= 5 || descendingCount >= 5) {
        return true;
      }
    }
    
    return false;
  }
}
