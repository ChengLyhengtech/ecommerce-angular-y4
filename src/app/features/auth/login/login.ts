import { Component, inject, signal, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { LoginRequestDto } from '../../../core/models/auth.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent implements OnInit {
  authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  @ViewChild('telegramContainer') telegramContainer?: ElementRef;

  email = signal<string>('');
  password = signal<string>('');

  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string>('');
  returnUrl = signal<string>('');
  showTelegramModal = signal<boolean>(false);

  constructor() {
    this.route.queryParams.subscribe((params) => {
      if (params['returnUrl']) {
        this.returnUrl.set(params['returnUrl']);
      }
    });
  }

  ngOnInit(): void {
    // Initialize Google Identity Services SDK
    this.authService.initGoogleAuth(
      (idToken: string) => this.handleGoogleCredentialResponse(idToken),
      'googleBtnContainerLogin'
    );
  }

  onLogin(): void {
    if (!this.email().trim() || !this.password().trim()) {
      this.errorMessage.set('Please enter your email and password.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const dto: LoginRequestDto = {
      email: this.email().trim(),
      password: this.password().trim()
    };

    this.authService.login(dto).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        if (res.success || res.accessToken) {
          this.navigateAfterAuth(res.user);
        }
      },
      error: (err) => {
        console.error('Login error:', err);
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || 'Invalid email or password. Please try again.');
      }
    });
  }

  // Quick Demo fill buttons for convenience
  fillCustomer(): void {
    this.email.set('john@example.com');
    this.password.set('Password123');
  }

  fillAdmin(): void {
    this.email.set('admin@ecommerce.com');
    this.password.set('Admin@123456');
  }

  loginWithGoogle(): void {
    this.errorMessage.set('');
    this.authService.promptGoogleOneTap();
  }

  handleGoogleCredentialResponse(idToken: string): void {
    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.authService.googleLogin(idToken).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        if (res.success || res.accessToken) {
          this.navigateAfterAuth(res.user);
        }
      },
      error: (err) => {
        console.error('Google Login error:', err);
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || 'Google Login failed. Ensure backend CORS and Client ID are configured.');
      }
    });
  }

  loginWithTelegram(): void {
    this.errorMessage.set('');
    this.showTelegramModal.set(true);
    setTimeout(() => {
      if (this.telegramContainer?.nativeElement) {
        this.authService.loadTelegramWidget(
          this.telegramContainer.nativeElement,
          (user: any) => this.handleTelegramAuthResponse(user)
        );
      }
    }, 50);
  }

  closeTelegramModal(): void {
    this.showTelegramModal.set(false);
  }

  handleTelegramAuthResponse(user: any): void {
    this.showTelegramModal.set(false);
    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.authService.telegramLogin(user).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        if (res.success || res.accessToken) {
          this.navigateAfterAuth(res.user);
        }
      },
      error: (err) => {
        console.error('Telegram Login error:', err);
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || 'Telegram Login failed.');
      }
    });
  }

  private navigateAfterAuth(user: any): void {
    const isAdminOrManager = user?.roles?.includes('Admin') || user?.roles?.includes('Manager');
    if (this.returnUrl()) {
      this.router.navigateByUrl(this.returnUrl());
    } else if (isAdminOrManager) {
      this.router.navigate(['/admin']);
    } else {
      this.router.navigate(['/']);
    }
  }
}

