import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.html',
  styleUrls: ['./settings.css']
})
export class SettingsComponent implements OnInit {
  loading = signal(false);
  saving = signal(false);
  message = signal('');
  companyName = signal('');
  adminPin = signal('');
  appLogo = signal('');

  constructor(private router: Router, private settingsService: SettingsService) {}

  ngOnInit() {
    this.loadSettings();
  }

  async loadSettings() {
    this.loading.set(true);
    await this.settingsService.loadSettings();
    this.companyName.set(this.settingsService.getCompanyName());
    this.adminPin.set(this.settingsService.getAdminPin());
    this.appLogo.set(this.settingsService.getAppLogo());
    this.loading.set(false);
  }

  async saveSettings() {
    this.saving.set(true);
    this.loading.set(true);
    const result = await this.settingsService.updateSettings({
      company_name: this.companyName(),
      admin_pin: this.adminPin(),
      app_logo: this.appLogo()
    });
    if (result.success) {
      this.message.set('Settings saved successfully');
      setTimeout(() => this.message.set(''), 3000);
    } else {
      this.message.set('Error saving settings');
    }
    this.saving.set(false);
    this.loading.set(false);
  }

  goBack() {
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state || history.state;
    
    if (state?.['fromAdmin']) {
      this.router.navigate(['/admin'], { state: { skipPin: true } });
    } else {
      this.router.navigate(['/home']);
    }
  }
}
