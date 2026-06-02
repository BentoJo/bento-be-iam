import { Controller, Get } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { TestService } from './services/test.service';
import { UserGrpcService } from './services/user-grpc.service';
import { UpdateUserProfileRequest } from '../../shared/types/users/users';

@Controller()
export class UserController {
  constructor(
    private readonly testService: TestService,
    private readonly userGrpcService: UserGrpcService,
  ) {}

  @Get()
  getHello(): string {
    return this.testService.getHello();
  }

  @GrpcMethod('UserService', 'GetUser')
  getUser(data: { userId: string }) {
    return this.userGrpcService.getUser(data.userId);
  }

  @GrpcMethod('UserService', 'UpdateUser')
  updateUser(data: { userId: string } & UpdateUserProfileRequest) {
    const { userId, ...profile } = data;
    return this.userGrpcService.updateUser(userId, profile);
  }

  @GrpcMethod('UserService', 'GetUsersByIds')
  getUsersByIds(data: { userIds: string[] }) {
    return this.userGrpcService.getUsersByIds(data.userIds ?? []);
  }
}
