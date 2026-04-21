import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { DevicesModule } from './devices/devices.module';
import { JwksModule } from './jwks/jwks.module';

@Module({
  imports: [AuthModule, UserModule, DevicesModule, JwksModule],
})
export class AppModule {}
