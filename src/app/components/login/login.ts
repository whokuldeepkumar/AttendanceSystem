import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {
  name = signal('');
  mobile = signal('');
  isLoading = signal(false);
  errors = signal<{ [key: string]: string }>({});

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
      this.authService.login(this.name(), this.mobile());
      this.toastService.success('Login successful!');
      setTimeout(() => {
        this.router.navigate(['/home']);
      }, 500);
    } catch (error) {
      this.toastService.error('Login failed. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
