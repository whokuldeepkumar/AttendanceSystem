import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './components/toast/toast';
import { HeaderComponent } from './components/header/header';
import { ThemeService } from './services/theme.service';
import { AuthService } from './services/auth.service';
import { FooterComponent } from './components/footer/footer';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, ToastComponent, HeaderComponent, FooterComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App implements OnInit {
  protected readonly title = signal('attendance-app');
  isLoggedIn() { return this.authService.isAuthenticated(); }

  constructor(private themeService: ThemeService, private authService: AuthService) {}

  ngOnInit() {
    // Initialize theme on app startup
    this.themeService.setTheme(this.themeService.theme());
  }
}
