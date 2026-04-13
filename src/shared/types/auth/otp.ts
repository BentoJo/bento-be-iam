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
