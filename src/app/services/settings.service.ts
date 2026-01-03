import { Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';

export interface AppSettings {
  company_name: string;
  admin_pin: string;
  app_logo: string;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private settings = signal<AppSettings>({
    company_name: 'Time Track',
    admin_pin: '0590',
    app_logo: ''
  });

  companyName = signal('Time Track');
  adminPin = signal('0590');
  appLogo = signal('');
  private loaded = false;

  constructor() {
    this.loadSettings();
  }

  async loadSettings() {
    try {
      const response = await fetch(`${environment.apiUrl}/settings`);
      const data = await response.json();
      this.settings.set(data);
      this.companyName.set(data.company_name || 'Time Track');
      this.adminPin.set(data.admin_pin || '0590');
      this.appLogo.set(data.app_logo || '');
      this.loaded = true;
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  async updateSettings(settings: Partial<AppSettings>) {
    try {
      const response = await fetch(`${environment.apiUrl}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const result = await response.json();
      if (result.success) {
        await this.loadSettings();
      }
      return result;
    } catch (error) {
      console.error('Error updating settings:', error);
      return { success: false, message: 'Error updating settings' };
    }
  }

  getSettings() {
    return this.settings();
  }

  getCompanyName() {
    return this.companyName();
  }

  getAdminPin() {
    return this.adminPin();
  }

  getAppLogo() {
    return this.appLogo();
  }
}
