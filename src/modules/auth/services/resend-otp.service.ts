import { Injectable } from '@nestjs/common';
import db from '../../../shared/configs/db.config';
import { otps, users } from '../../../shared/db/schema';
import { createAndSendOtp } from '../../../shared/utils/send-otp';
import { eq, desc } from 'drizzle-orm';
import { OtpResendResponse } from '../../../shared/types/auth/otp';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { validateEmail, validateRequired } from '../../../shared/validations';

@Injectable()
export class ResendOtpService {
  async resendOtp(data: { email: string }): Promise<OtpResendResponse> {
    const { email } = data;

    // Validate input
    this.validateInput(email);

    const [user] = await db.select().from(users).where(eq(users.email, email));

    if (!user) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'USER_NOT_FOUND',
      });
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'ACCOUNT_LOCKED',
      });
    }

    const [lastOtp] = await db
      .select()
      .from(otps)
      .where(eq(otps.userId, user.id))
      .orderBy(desc(otps.createdAt))
      .limit(1);

    if (lastOtp && Date.now() - new Date(lastOtp.createdAt).getTime() < 60000) {
      // 1 minute cooldown
      throw new RpcException({
        code: GrpcStatus.RESOURCE_EXHAUSTED,
        message: 'OTP_RESEND_TOO_SOON',
      });
    }

    return await createAndSendOtp(
      user.id,
      user.firstName + ' ' + user.lastName,
      user.email,
      lastOtp?.type ?? 'LOGIN',
    );
  }

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
