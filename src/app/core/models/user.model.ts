export interface UserResponseDto {
  id: string;
  fullName: string;
  email: string;
  isBanned: boolean;
  banReason?: string;
  createdAt: string;
  roles: string[];
}

export interface UserCreateAdminDto {
  email: string;
  password: string;
  fullName: string;
  role: string;
}

export interface UserUpdateRoleDto {
  role: string;
}

export interface UserBanDto {
  isBanned: boolean;
  banReason?: string;
}
