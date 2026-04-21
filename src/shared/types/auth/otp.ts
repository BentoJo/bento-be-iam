export interface VerifyOtp {
  email: string;
  code: string;
}

export interface OtpResendResponse {
  method: string;
  email: string;
  expiresIn: string;
}

export interface VerifyOtpResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
  user: UserInfo;
  session: SessionInfo;
}

export interface UserInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

export interface SessionInfo {
  sessionId: string;
  deviceId: string;
}
