import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.html',
  styleUrls: ['./admin.css']
})
export class AdminComponent implements OnInit {
  private readonly DEFAULT_PIN = '0590';
  isAuthenticated = signal(false);
  enteredPin = signal('');
  showError = signal(false);

  constructor(private router: Router) {}

  ngOnInit() {
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
    if (this.enteredPin() === this.DEFAULT_PIN) {
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

  goBack() {
    this.router.navigate(['/home']);
  }
}
