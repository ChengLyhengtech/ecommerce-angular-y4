import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { 
  AuthUser, 
  AuthResponseDto, 
  LoginRequestDto, 
  RegisterRequestDto, 
  GoogleLoginRequestDto, 
  TelegramLoginRequestDto, 
  RefreshTokenRequestDto 
} from '../models/auth.model';
import { environment } from '../../../environments/environment';

const ACCESS_TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user_data';
const USER_ID_KEY = 'userId';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = `${environment.apiUrl}/api/auth`;

  // Reactive state
  currentUser = signal<AuthUser | null>(this.loadSavedUser());
  
  isLoggedIn = computed(() => !!this.currentUser());
  isAdmin = computed(() => {
    const user = this.currentUser();
    if (!user || !user.roles) return false;
    return user.roles.includes('Admin') || user.roles.includes('Manager');
  });

  private loadSavedUser(): AuthUser | null {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(USER_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          return null;
        }
      }
    }
    return null;
  }

  getAccessToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(ACCESS_TOKEN_KEY);
    }
    return null;
  }

  getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(REFRESH_TOKEN_KEY);
    }
    return null;
  }

  private handleAuthSuccess(res: AuthResponseDto): AuthResponseDto {
    if (typeof window !== 'undefined' && res.accessToken) {
      localStorage.setItem(ACCESS_TOKEN_KEY, res.accessToken);
      if (res.refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, res.refreshToken);
      }
      if (res.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(res.user));
        localStorage.setItem(USER_ID_KEY, res.user.id);
        this.currentUser.set(res.user);
      }
    }
    return res;
  }

  login(dto: LoginRequestDto): Observable<AuthResponseDto> {
    return this.http.post<AuthResponseDto>(`${this.apiUrl}/login`, dto).pipe(
      tap((res) => this.handleAuthSuccess(res))
    );
  }

  register(dto: RegisterRequestDto): Observable<AuthResponseDto> {
    return this.http.post<AuthResponseDto>(`${this.apiUrl}/register`, dto).pipe(
      tap((res) => this.handleAuthSuccess(res))
    );
  }

  googleLogin(idToken: string): Observable<AuthResponseDto> {
    const dto: GoogleLoginRequestDto = { idToken };
    return this.http.post<AuthResponseDto>(`${this.apiUrl}/google-login`, dto).pipe(
      tap((res) => this.handleAuthSuccess(res))
    );
  }

  telegramLogin(dto: TelegramLoginRequestDto | any): Observable<AuthResponseDto> {
    const payload: TelegramLoginRequestDto = {
      id: Number(dto.id),
      first_Name: dto.first_Name || dto.first_name || '',
      first_name: dto.first_name || dto.first_Name || '',
      last_Name: dto.last_Name || dto.last_name || '',
      last_name: dto.last_name || dto.last_Name || '',
      username: dto.username || '',
      photo_Url: dto.photo_Url || dto.photo_url || '',
      photo_url: dto.photo_url || dto.photo_Url || '',
      auth_Date: Number(dto.auth_Date || dto.auth_date || Math.floor(Date.now() / 1000)),
      auth_date: Number(dto.auth_date || dto.auth_Date || Math.floor(Date.now() / 1000)),
      hash: dto.hash || ''
    };
    return this.http.post<AuthResponseDto>(`${this.apiUrl}/telegram-login`, payload).pipe(
      tap((res) => this.handleAuthSuccess(res))
    );
  }

  loadGoogleGisScript(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') return resolve();
      if ((window as any).google?.accounts?.id) {
        return resolve();
      }

      const existingScript = document.getElementById('google-gis-script');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve());
        return resolve();
      }

      const script = document.createElement('script');
      script.id = 'google-gis-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      document.head.appendChild(script);
    });
  }

  async initGoogleAuth(onCredentialReceived: (idToken: string) => void, renderContainerId?: string): Promise<void> {
    await this.loadGoogleGisScript();

    if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
      const google = (window as any).google;
      google.accounts.id.initialize({
        client_id: (environment as any).googleClientId || '365824161370-cjsavvna7mafllhgihjkipgcl34k0gu7.apps.googleusercontent.com',
        callback: (response: { credential?: string }) => {
          if (response.credential) {
            onCredentialReceived(response.credential);
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true
      });

      if (renderContainerId) {
        const container = document.getElementById(renderContainerId);
        if (container) {
          container.innerHTML = '';
          google.accounts.id.renderButton(container, {
            theme: 'outline',
            size: 'large',
            type: 'standard',
            shape: 'rectangular',
            text: 'signin_with',
            logo_alignment: 'left',
            width: 240
          });
        }
      }
    }
  }

  promptGoogleOneTap(): void {
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
      (window as any).google.accounts.id.prompt();
    }
  }

  loadTelegramWidget(container: HTMLElement, onAuthCallback: (user: any) => void, botUsername?: string): void {
    if (typeof window === 'undefined' || !container) return;

    const callbackName = 'onTelegramAuth_' + Math.floor(Math.random() * 100000);
    (window as any)[callbackName] = (user: any) => {
      onAuthCallback(user);
    };

    (window as any).onTelegramAuth = (user: any) => {
      onAuthCallback(user);
    };

    container.innerHTML = '';
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botUsername || (environment as any).telegramBotUsername || 'CLH168_bot');
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-onauth', `${callbackName}(user)`);
    script.setAttribute('data-request-access', 'write');
    script.async = true;

    container.appendChild(script);
  }

  refreshToken(): Observable<AuthResponseDto> {
    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();

    if (!accessToken || !refreshToken) {
      this.logout();
      return throwError(() => new Error('No refresh token available'));
    }

    const dto: RefreshTokenRequestDto = { accessToken, refreshToken };
    return this.http.post<AuthResponseDto>(`${this.apiUrl}/refresh-token`, dto).pipe(
      tap((res) => this.handleAuthSuccess(res)),
      catchError((err) => {
        this.logout();
        return throwError(() => err);
      })
    );
  }

  logout(): void {
    const accessToken = this.getAccessToken();
    if (accessToken) {
      this.http.post(`${this.apiUrl}/revoke-token`, {}).pipe(
        catchError(() => of(null))
      ).subscribe();
    }

    if (typeof window !== 'undefined') {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(USER_ID_KEY);
    }
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }
}
