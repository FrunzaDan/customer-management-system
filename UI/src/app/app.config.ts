import {
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import {
  provideClientHydration,
  withEventReplay,
  withNoIncrementalHydration,
} from '@angular/platform-browser';
import {
  provideRouter,
  TitleStrategy,
  withComponentInputBinding,
  withInMemoryScrolling,
  withRouterConfig,
} from '@angular/router';
import { routes } from './app.routes';
import { apiLoggerInterceptor } from './services/api-logger.interceptor';
import { AppTitleStrategy } from './services/app-title-strategy';
import { authErrorInterceptor } from './services/auth-error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({
        scrollPositionRestoration: 'top',
        anchorScrolling: 'enabled',
      }),
      // The unsaved-changes guard can cancel a browser Back/Forward. The default
      // ('replace') overwrites a history entry when that happens, so a second
      // Back press skips the guard; 'computed' restores history correctly.
      withRouterConfig({ canceledNavigationResolution: 'computed' }),
    ),
    { provide: TitleStrategy, useClass: AppTitleStrategy },
    provideClientHydration(withEventReplay(), withNoIncrementalHydration()),
    provideHttpClient(
      withFetch(),
      withInterceptors([apiLoggerInterceptor, authErrorInterceptor]),
    ),
    provideZonelessChangeDetection(),
  ],
};
