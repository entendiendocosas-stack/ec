

import { bootstrapApplication } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { AppComponent } from './src/app.component';

// Robust Process Polyfill for Browser Environments
// We check if process exists first to avoid overwriting existing environments (like Vercel's injection)
if (typeof process === 'undefined') {
  (window as any).process = { env: {} };
} else if (!process.env) {
  (process as any).env = {};
}

import { appConfig } from './src/app.config';

bootstrapApplication(AppComponent, appConfig).catch(err => console.error(err));

// AI Studio always uses an `index.tsx` file for all project types.
