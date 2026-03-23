import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { TestService } from './services/test.service';

@Module({
  imports: [],
  controllers: [UserController],
  providers: [TestService],
})
export class UserModule {}
