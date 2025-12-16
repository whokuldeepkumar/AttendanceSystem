import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private permissionGranted = false;

  constructor() {
    this.requestPermission();
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      this.permissionGranted = true;
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      this.permissionGranted = permission === 'granted';
      return this.permissionGranted;
    }

    return false;
  }

  showNotification(title: string, options?: NotificationOptions): void {
    if (!this.permissionGranted) {
      console.log('Notification permission not granted');
      return;
    }

    const defaultOptions: NotificationOptions = {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      requireInteraction: true,
      ...options
    };

    try {
      const notification = new Notification(title, defaultOptions);
      
      // Vibrate on mobile devices
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
      
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  showClockOutReminder(hoursElapsed: number): void {
    const hours = Math.floor(hoursElapsed);
    const minutes = Math.floor((hoursElapsed - hours) * 60);
    
    this.showNotification(
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
