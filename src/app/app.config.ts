import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    // 🛠️ CAMBIO: Quitamos el eventCoalescing
    provideZoneChangeDetection({ eventCoalescing: false }), 
    provideRouter(routes),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor]))
  ]
};