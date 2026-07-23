export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  photoUrl?: string;
}

export interface AuthResponseDto {
  success: boolean;
  message: string;
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiration?: string;
  user: AuthUser;
}

export interface RegisterRequestDto {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface GoogleLoginRequestDto {
  idToken: string;
}

export interface TelegramLoginRequestDto {
  id: number;
  first_Name?: string;
  first_name?: string;
  last_Name?: string;
  last_name?: string;
  username?: string;
  photo_Url?: string;
  photo_url?: string;
  auth_Date?: number;
  auth_date?: number;
  hash: string;
}


export interface RefreshTokenRequestDto {
  accessToken: string;
  refreshToken: string;
}
