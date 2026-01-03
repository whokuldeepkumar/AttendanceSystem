import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import '@angular/compiler'; // Required for dynamic component compilation

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
