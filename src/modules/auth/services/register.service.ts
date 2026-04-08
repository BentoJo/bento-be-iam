import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { eq } from 'drizzle-orm';

import db from '../../../shared/configs/db.config';
import { users } from '../../../shared/db/schema';
import { validateRequired, validateEmail } from '../../../shared/validations';
import { createAndSendOtp } from '../../../shared/utils/send-otp';
import {
  RegisterRequest,
  RegisterResponse,
} from '../../../shared/types/auth/register';

//  Service

@Injectable()
export class RegisterService {
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const { email, firstName, lastName } = data;

    // Validate
    this.validateInput(email);

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail));

    if (existingUser.length > 0) {
      throw new RpcException({
        code: GrpcStatus.ALREADY_EXISTS,
        message: 'EMAIL_ALREADY_USED',
      });
    }
    // Create new user
    const [newUser] = await db
      .insert(users)
      .values({
        email: normalizedEmail,
        firstName: firstName,
        lastName: lastName,
        authStatus: 'notVerified',
        globalRole: 'user',
        failedAttempts: 0,
        lockedUntil: null,
      })
      .returning({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        authStatus: users.authStatus,
      });

    await createAndSendOtp(
      newUser.id,
      newUser.firstName + ' ' + newUser.lastName,
      newUser.email,
      'registration',
    );
    return {
      user_id: newUser.id,
      email: newUser.email,
      auth_status: newUser.authStatus!,
    };
  }

  // Private Helpers

  private validateInput(email: string): void {
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
