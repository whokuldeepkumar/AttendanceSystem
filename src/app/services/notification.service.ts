import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private permissionGranted = false;

  constructor() {
    this.checkPermission();
  }

  isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window && typeof Notification !== 'undefined';
  }
  
  getPermissionStatus(): NotificationPermission | null {
    if (!this.isSupported()) return null;
    return Notification.permission;
  }

  private checkPermission(): void {
    if (!this.isSupported()) {
      console.log('This browser does not support notifications (iOS Safari)');
      return;
    }

    if (Notification.permission === 'granted') {
      this.permissionGranted = true;
      console.log('Notification permission already granted');
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      console.log('This browser does not support notifications (iOS Safari)');
      return false;
    }

    try {
      if (Notification.permission === 'granted') {
        this.permissionGranted = true;
        console.log('Notification permission already granted');
        return true;
      }

      if (Notification.permission === 'denied') {
        console.log('Notification permission denied');
        return false;
      }

      const permission = await Notification.requestPermission();
      this.permissionGranted = permission === 'granted';
      console.log('Notification permission:', permission);
      return this.permissionGranted;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  async showNotification(title: string, options?: NotificationOptions): Promise<void> {
    if (!this.isSupported()) {
      console.log('Notifications not supported on this browser (iOS Safari)');
      return;
    }

    console.log('Attempting to show notification:', title);
    console.log('Permission status:', Notification.permission);
    
    if (!this.permissionGranted) {
      console.log('Permission not granted, requesting...');
      const granted = await this.requestPermission();
      if (!granted) {
        console.log('User denied notification permission');
        return;
      }
    }

    const defaultOptions: NotificationOptions = {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      requireInteraction: true,
      ...options
    };

    try {
      console.log('Creating notification with options:', defaultOptions);
      const notification = new Notification(title, defaultOptions);
      
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
      
      notification.onclick = () => {
        console.log('Notification clicked');
        window.focus();
        notification.close();
      };
      
      console.log('Notification created successfully');
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  async showClockOutReminder(hoursElapsed: number): Promise<void> {
    if (!this.isSupported()) {
      console.log('Clock out reminder: Notifications not supported on iOS Safari');
      return;
    }

    const hours = Math.floor(hoursElapsed);
    const minutes = Math.floor((hoursElapsed - hours) * 60);
    
    console.log(`Showing clock out reminder for ${hours}h ${minutes}m`);
    
    await this.showNotification(
      '⏰ Time to Clock Out!',
      {
        body: `You've been working for ${hours}h ${minutes}m! 😊\nDon't forget to clock out and take a well-deserved break! 🎉`,
        icon: '/favicon.ico',
        tag: 'clock-out-reminder',
        requireInteraction: true
      }
    );
  }
}
