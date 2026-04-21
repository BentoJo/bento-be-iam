import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { HealthService } from './services/health.service';
import { RegisterService } from './services/register.service';
import { OtpService } from './services/verify-otp.service';
import { ResendOtpService } from './services/resend-otp.service';
import { LoginService } from './services/login.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { SessionFunction } from '../../shared/func/session';
import { DeviceFunction } from '../../shared/func/device';
import { UserFunction } from '../../shared/func/users';

@Module({
  controllers: [AuthController],
  providers: [
    HealthService,
    RegisterService,
    LoginService,
    OtpService,
    ResendOtpService,
    RefreshTokenService,
    SessionFunction,
    DeviceFunction,
    UserFunction,
  ],
})
export class AuthModule {}
