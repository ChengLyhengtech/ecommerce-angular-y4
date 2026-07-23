import { Component, inject, signal, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { RegisterRequestDto } from '../../../core/models/auth.model';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class RegisterComponent implements OnInit {
  authService = inject(AuthService);
  private router = inject(Router);

  @ViewChild('telegramContainer') telegramContainer?: ElementRef;

  fullName = signal<string>('');
  email = signal<string>('');
  password = signal<string>('');
  confirmPassword = signal<string>('');

  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string>('');
  showTelegramModal = signal<boolean>(false);

  ngOnInit(): void {
    // Initialize Google Identity Services SDK
    this.authService.initGoogleAuth(
      (idToken: string) => this.handleGoogleCredentialResponse(idToken),
      'googleBtnContainerRegister'
    );
  }

  onRegister(): void {
    if (!this.fullName().trim() || !this.email().trim() || !this.password() || !this.confirmPassword()) {
      this.errorMessage.set('Please fill out all required fields.');
      return;
    }

    if (this.password() !== this.confirmPassword()) {
      this.errorMessage.set('Password and Confirm Password do not match.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const dto: RegisterRequestDto = {
      fullName: this.fullName().trim(),
      email: this.email().trim(),
      password: this.password(),
      confirmPassword: this.confirmPassword()
    };

    this.authService.register(dto).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        if (res.success || res.accessToken) {
          this.router.navigate(['/']);
        }
      },
      error: (err) => {
        console.error('Register error:', err);
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || 'Registration failed. Please try again.');
      }
    });
  }

  registerWithGoogle(): void {
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
          this.router.navigate(['/']);
        }
      },
      error: (err) => {
        console.error('Google Register error:', err);
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || 'Google registration failed. Ensure backend CORS and Client ID are configured.');
      }
    });
  }

  registerWithTelegram(): void {
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
          this.router.navigate(['/']);
        }
      },
      error: (err) => {
        console.error('Telegram Register error:', err);
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || 'Telegram registration failed.');
      }
    });
  }
}

