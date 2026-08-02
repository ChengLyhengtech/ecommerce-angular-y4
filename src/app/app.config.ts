import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes), 
    provideHttpClient(withInterceptors([authInterceptor])),
    provideTanStackQuery(new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 1000 * 60 * 5, // 5 minutes cache
          gcTime: 1000 * 60 * 10,   // 10 minutes GC
          retry: false,             // Do not retry failed API queries endlessly
          refetchOnWindowFocus: false, // Prevent refetching when user switches tabs
          refetchOnMount: false      // Do not refetch on component remount if cached
        }
      }
    }))
  ]
};
