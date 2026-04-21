import { Injectable } from '@nestjs/common';
import db from '../../../shared/configs/db.config';
import { otps, users } from '../../../shared/db/schema';
import { createAndSendOtp } from '../../../shared/utils/send-otp';
import { eq, sql, desc, and } from 'drizzle-orm';
import { OtpType } from '../../../shared/types/auth/session';
import { OtpResendResponse } from '../../../shared/types/auth/otp';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';

@Injectable()
export class ResendOtpService {
  async resendOtp(data: { email: string }): Promise<OtpResendResponse> {
    const { email } = data;
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

    if (lastOtp.usedAt !== null) {
      throw new RpcException({
        code: GrpcStatus.FAILED_PRECONDITION,
        message: 'OTP_ALREADY_USED',
      });
    }

    if (Date.now() - new Date(lastOtp.createdAt).getTime() < 60000) {
      // 1 minute cooldown
      throw new RpcException({
        code: GrpcStatus.RESOURCE_EXHAUSTED,
        message: 'OTP_RESEND_TOO_SOON',
      });
    }

    return (await createAndSendOtp(
      user.id,
      user.firstName + ' ' + user.lastName,
      user.email,
      lastOtp.type as OtpType,
    )) as OtpResendResponse;
  }
}
