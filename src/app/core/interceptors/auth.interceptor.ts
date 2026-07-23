import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getAccessToken();

  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // If 401 Unauthorized and not already refreshing token endpoint
      if (error.status === 401 && !req.url.includes('/api/auth/refresh-token') && !req.url.includes('/api/auth/login')) {
        return authService.refreshToken().pipe(
          switchMap((res) => {
            const newToken = res.accessToken;
            const newReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${newToken}`
              }
            });
            return next(newReq);
          }),
          catchError((refreshErr) => {
            return throwError(() => refreshErr);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
