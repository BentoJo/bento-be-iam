import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { TestService } from './services/test.service';
import { UserGrpcService } from './services/user-grpc.service';
import { UserFunction } from '../../shared/func/users';

@Module({
  imports: [],
  controllers: [UserController],
  providers: [TestService, UserGrpcService, UserFunction],
})
export class UserModule {}
