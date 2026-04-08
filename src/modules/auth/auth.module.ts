import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { HealthService } from './services/health.service';
import { RegisterService } from './services/register.service';

@Module({
  controllers: [AuthController],
  providers: [HealthService, RegisterService],
})
export class AuthModule {}
