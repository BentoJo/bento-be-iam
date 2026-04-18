import { Injectable } from '@nestjs/common';
import { LoginRequest, LoginResponse } from '../../../shared/types/auth/login';
import { validateEmail, validateRequired } from '../../../shared/validations';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { users } from '../../../shared/db/schema';
import db from '../../../shared/configs/db.config';
import { eq } from 'drizzle-orm';
import { createAndSendOtp } from '../../../shared/utils/send-otp';

@Injectable()
export class LoginService {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const { email } = data;
    //Validation
    this.validateInput(data);
    const normalizedEmail = email.trim().toLowerCase();

    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail));

    if (!existingUser) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'USER_NOT_FOUND',
      });
    }

    await createAndSendOtp(
      existingUser.id,
      existingUser.firstName + ' ' + existingUser.lastName,
      existingUser.email,
      'LOGIN',
    );
    return {
      success: true,
      message: 'otp sent successfully',
    };
  }

  private validateInput({ email }: LoginRequest): void {
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
