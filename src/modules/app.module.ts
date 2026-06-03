import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { DevicesModule } from './devices/devices.module';
import { SessionsModule } from './sessions/sessions.module';
import { JwksModule } from './jwks/jwks.module';

@Module({
  imports: [AuthModule, UserModule, DevicesModule, SessionsModule, JwksModule],
})
export class AppModule {}
