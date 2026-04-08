import { Injectable } from '@nestjs/common';
import { LoginRequest, LoginResponse } from '../../../shared/types/auth/login';
import { validateRequired } from '../../../shared/validations';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';

@Injectable()
export class LoginService {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const { email, device_id, device_name, user_agent, ip_address } = data;

    //Validation
  }

  private validateInputs({email, device_id, user_agent}: {email}): void {
    const requiredData = validateRequired(email, 'Email');
    if (!requiredData.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: requiredData.message,
      });
    }
  }
}
