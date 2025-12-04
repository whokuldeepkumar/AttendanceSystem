import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <footer class="app-footer">
      <div class="footer-content">
        <div class="footer-section">
          <h4>About</h4>
          <p>Attendance tracking application with real-time clock-in/out functionality.</p>
        </div>

        <!-- Quick Links removed as requested -->


      </div>

      <div class="footer-bottom">
        <p>&copy; 2025 Attendance App. All rights reserved.</p>
        <p>Version 1.0.0 | Last updated: December 2025</p>
      </div>
    </footer>
  `,
  styles: [`
    .app-footer {
      background: var(--glass-bg);
      backdrop-filter: blur(12px);
      border-top: 1px solid var(--glass-border);
      color: var(--text-color);
      margin-top: 24px;
      padding: 12px 12px;
      /* participate in normal document flow so it appears after page content */
      position: relative;
    }

    .footer-content {
      max-width: 1200px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--glass-border);
    }

    .footer-section h4 {
      margin: 0 0 8px 0;
      font-size: 14px;
      font-weight: 700;
      color: var(--text-color);
    }

    .footer-section p {
      margin: 0;
      color: var(--text-muted);
      font-size: 13px;
      line-height: 1.4;
    }

    .footer-section ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .footer-section li {
      margin-bottom: 8px;
    }

    .footer-section a {
      color: var(--text-muted);
      text-decoration: none;
      font-size: 14px;
      transition: color 0.3s ease;
    }

    .footer-section a:hover {
      color: var(--text-color);
    }



    .footer-bottom {
      max-width: 1200px;
      margin: 0 auto;
      text-align: center;
      padding-top: 8px;
    }

    .footer-bottom p {
      margin: 4px 0;
      color: var(--text-muted);
      font-size: 12px;
    }

    @media (max-width: 768px) {
      .app-footer {
        padding: 12px 12px;
        margin-top: 20px;
      }

      .footer-content {
        grid-template-columns: 1fr;
        gap: 12px;
        margin-bottom: 12px;
        padding-bottom: 12px;
      }

      .footer-section h4 {
        font-size: 14px;
      }

      .footer-section p,
      .footer-section a {
        font-size: 13px;
      }


    }

    @media (max-width: 480px) {
      .app-footer {
        padding: 10px 10px 8px;
        margin-top: 16px;
      }

      .footer-content {
        gap: 10px;
        margin-bottom: 10px;
        padding-bottom: 10px;
      }

      .footer-section h4 {
        font-size: 13px;
        margin-bottom: 8px;
      }

      .footer-section p,
      .footer-section a {
        font-size: 12px;
      }

      .footer-bottom p {
        font-size: 11px;
      }


    }
  `]
})
export class FooterComponent {
}

