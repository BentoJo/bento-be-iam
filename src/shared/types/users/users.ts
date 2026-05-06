export interface UserInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  bio: string | null;
  phone: string | null;
  dob: string | null;
  gender: string | null;
  authStatus: 'notVerified' | 'verified' | 'banned' | null;
  globalRole: 'superAdmin' | 'admin' | 'user' | null;
  lockedUntil: Date | null;
  failedAttempts: number | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
}

export interface UpdateUserProfileRequest {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
  bio?: string | null;
  phone?: string | null;
  dob?: string | null;
  gender?: string | null;
}

export interface UpdateUserAuthStatusRequest {
  authStatus: 'notVerified' | 'verified' | 'banned';
}

export interface UpdateUserRoleRequest {
  globalRole: 'superAdmin' | 'admin' | 'user';
}
