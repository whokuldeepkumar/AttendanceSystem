import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  isSupported(): boolean {
    return 'Notification' in window;
  }
  
  getPermissionStatus(): NotificationPermission {
    return Notification.permission;
  }
  private permissionGranted = false;

  constructor() {
    this.checkPermission();
  }

  private checkPermission(): void {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return;
    }

    if (Notification.permission === 'granted') {
      this.permissionGranted = true;
      console.log('Notification permission already granted');
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      this.permissionGranted = true;
      console.log('Notification permission already granted');
      return true;
    }

    if (Notification.permission === 'denied') {
      console.log('Notification permission denied');
      return false;
    }

    try {
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
      
      // Vibrate on mobile devices
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
