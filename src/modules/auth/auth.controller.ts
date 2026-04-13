import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { HealthService } from './services/health.service';
import { RegisterService } from './services/register.service';
import { OtpService } from './services/verify-otp.service';
import { ResendOtpService } from './services/resend-otp.service';

@Controller()
export class AuthController {
  constructor(
    private readonly healthService: HealthService,
    private readonly registerService: RegisterService,
    private readonly otpService: OtpService,
    private readonly resendOTPService: ResendOtpService,
  ) {}

  @GrpcMethod('AuthService', 'HealthCheck')
  healthCheck() {
    return { status: this.healthService.healthCheck() };
  }

  @GrpcMethod('AuthService', 'Register')
  register(data: { email: string; firstName: string; lastName: string }) {
    return this.registerService.register(data);
  }

  @GrpcMethod('AuthService', 'VerifyOTP')
  verifyOTP(data: { email: string; code: string }) {
    return this.otpService.verifyOtp(data);
  }

  @GrpcMethod('AuthService', 'ResendOTP')
  resendOTP(data: { email: string }) {
    return this.resendOTPService.resendOtp(data);
  }
}
