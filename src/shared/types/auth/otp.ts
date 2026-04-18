export interface VerifyOtp {
  email: string;
  code: string;
}

export interface RegisterOTPResponse {
  verified: boolean;
  nextStep: 'complete_profile';
  tempToken: string;
}

export interface OtpResendResponse {
  method: 'EMAIL';
  email: string;
  expiresIn: number;
}

export interface LoginOTPResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: string;
  refreshTokenExpiresIn: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
  session: {
    sessionId: string;
    deviceId: string;
  };
}
