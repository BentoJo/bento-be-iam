import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { HealthService } from './services/health.service';
import { RegisterService } from './services/register.service';
import { OtpService } from './services/verify-otp.service';
import { ResendOtpService } from './services/resend-otp.service';
import { ClientData } from '../../shared/types/auth/session';
import { LoginService } from './services/login.service';
import { RefreshTokenService } from './services/refresh-token.service';

@Controller()
export class AuthController {
  constructor(
    private readonly healthService: HealthService,
    private readonly registerService: RegisterService,
    private readonly loginService: LoginService,
    private readonly otpService: OtpService,
    private readonly resendOTPService: ResendOtpService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  @GrpcMethod('AuthService', 'HealthCheck')
  healthCheck() {
    return { status: this.healthService.healthCheck() };
  }

  @GrpcMethod('AuthService', 'Register')
  register(data: { email: string; firstName: string; lastName: string }) {
    return this.registerService.register(data);
  }

  @GrpcMethod('AuthService', 'Login')
  login(data: { email: string }) {
    return this.loginService.login(data);
  }

  @GrpcMethod('AuthService', 'VerifyOTP')
  verifyOTP(data: { email: string; code: string }) {
    const clientData: ClientData = {
      deviceFingerprint: 'DEMO',
      ipAddress: 'DEMO',
      deviceInfo: 'DEMO',
      location: 'DEMO',
      deviceToken: 'DEMO',
      fingerprintComponents: {
        deviceName: 'DEMO',
        hardwareConcurrency: 0,
        platform: 'DEMO',
        language: 'DEMO',
        timezone: 'DEMO',
      },
    };
    return this.otpService.verifyOtp(data, clientData);
  }

  @GrpcMethod('AuthService', 'ResendOTP')
  resendOTP(data: { email: string }) {
    return this.resendOTPService.resendOtp(data);
  }

  @GrpcMethod('AuthService', 'RefreshToken')
  refreshToken(data: { refreshToken: string }) {
    return this.refreshTokenService.refreshToken(data);
  }
}
