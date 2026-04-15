import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { DevicesModule } from './devices/devices.module';

@Module({
  imports: [AuthModule, UserModule, DevicesModule],
})
export class AppModule {}
