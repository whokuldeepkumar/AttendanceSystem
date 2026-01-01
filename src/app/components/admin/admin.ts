import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.html',
  styleUrls: ['./admin.css']
})
export class AdminComponent implements OnInit {
  isAuthenticated = signal(false);
  enteredPin = signal('');
  showError = signal(false);

  constructor(
    private router: Router, 
    private authService: AuthService,
    private settingsService: SettingsService
  ) {}

  ngOnInit() {
    // Check if user is logged in
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state || history.state;
    
    if (state?.['skipPin']) {
      this.isAuthenticated.set(true);
    }
  }

  onPinInput(event: any) {
    const value = event.target.value;
    if (value.length <= 4) {
      this.enteredPin.set(value);
      this.showError.set(false);
      
      if (value.length === 4) {
        this.verifyPin();
      }
    }
  }

  verifyPin() {
    if (this.enteredPin() === this.settingsService.getAdminPin()) {
      this.isAuthenticated.set(true);
      this.showError.set(false);
    } else {
      this.showError.set(true);
      setTimeout(() => {
        this.enteredPin.set('');
        this.showError.set(false);
      }, 1000);
    }
  }

  goToEmployees() {
    this.router.navigate(['/employees'], { state: { fromAdmin: true } });
  }

  goToBulkAttendance() {
    this.router.navigate(['/bulk-attendance'], { state: { fromAdmin: true } });
  }

  goToAttendanceReport() {
    this.router.navigate(['/attendance-report'], { state: { fromAdmin: true } });
  }

  goToDeleteAttendance() {
    this.router.navigate(['/delete-attendance'], { state: { fromAdmin: true } });
  }

  goToLeaveManagement() {
    this.router.navigate(['/leave-management'], { state: { fromAdmin: true } });
  }

  goToSettings() {
    this.router.navigate(['/settings'], { state: { fromAdmin: true } });
  }

  goBack() {
    this.router.navigate(['/home']);
  }
}
