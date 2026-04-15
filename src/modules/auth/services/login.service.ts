import { Injectable } from '@nestjs/common';
import { LoginRequest, LoginResponse } from '../../../shared/types/auth/login';
import { validateEmail, validateRequired } from '../../../shared/validations';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';

@Injectable()
export class LoginService {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const { email, device_id, device_name, user_agent, ip_address } = data;

    //Validation

    return 0;
  }

  private validateInputs({
    email,
    device_id,
    device_name,
    user_agent,
    ip_address,
  }: LoginRequest): void {
    const requiredResult = validateRequired(email, 'Email');
    if (!requiredResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: requiredResult.message,
      });
    }

    const emailResult = validateEmail(email);
    if (!emailResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: emailResult.message,
      });
    }
  }
}
