import { Injectable, Session } from '@nestjs/common';
import { eq, and, desc, isNull, sql } from 'drizzle-orm';
import { devices, otps, sessions, users } from '../../../shared/db/schema';
import {
  ClientData,
  FingerprintComponents,
} from '../../../shared/types/auth/session';
import db from '../../../shared/configs/db.config';
import { hash } from '../../../shared/utils/hash';
import jwt from 'jsonwebtoken';
import {
  ACCESS_TOKEN_EXPIRY,
  MAX_ACTIVE_SESSIONS,
  MAX_DEVICES,
  MIN_SOFT_MATCHES_FOR_MERGE,
  SESSION_LIFETIME_DAYS,
} from '../../../shared/constants/auth';
import { randomBytes } from 'crypto';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import {
  LoginOTPResponse,
  RegisterOTPResponse,
  VerifyOtp,
} from '../../../shared/types/auth/otp';
import { DeviceFunction } from '../../../shared/func/device';
import { SessionFunction } from '../../../shared/func/session';
import {
  validateEmail,
  validateOTP,
  validateRequired,
} from '../../../shared/validations';

@Injectable()
export class OtpService {
  async verifyOtp(
    data: VerifyOtp,
    clientData: ClientData,
  ): Promise<{
    login?: LoginOTPResponse;
    register?: RegisterOTPResponse;
  }> {
    const { email, code } = data;
    // validate input
    this.validateInput(data);

    const conditions = [eq(users.email, email)];

    const validate = await db
      .select()
      .from(otps)
      .innerJoin(users, eq(otps.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(otps.createdAt))
      .limit(1);

    if (validate.length === 0) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'INVALID_OTP',
      });
    }

    const otpRecord = validate[0].otps;
    const userRecord = validate[0].users;

    if (
      userRecord.lockedUntil &&
      new Date() < new Date(userRecord.lockedUntil)
    ) {
      const remainingTime = Math.ceil(
        (new Date(userRecord.lockedUntil).getTime() - new Date().getTime()) /
          60000,
      );
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'account locked. Try again in ' + remainingTime + ' minutes',
      });
    }

    if (otpRecord.usedAt !== null) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'OTP_ALREADY_USED',
      });
    }

    if (otpRecord.attempts && otpRecord.attempts >= 3) {
      throw new RpcException({
        code: GrpcStatus.RESOURCE_EXHAUSTED,
        message: 'TOO_MANY_ATTEMPTS',
      });
    }

    if (new Date() > otpRecord.expiresAt) {
      throw {
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'OTP_EXPIRED',
      };
    }

    const isValid = (await hash(code)) === otpRecord.code;

    if (!isValid) {
      const currentOtpAttempts = (otpRecord.attempts || 0) + 1;
      const totalUserFailedAttempts = (userRecord.failedAttempts || 0) + 1;

      let lockoutUpdate = {};

      if (totalUserFailedAttempts % 5 === 0) {
        const lockoutMinutes = totalUserFailedAttempts * 2;
        const lockoutDate = new Date();
        lockoutDate.setMinutes(lockoutDate.getMinutes() + lockoutMinutes);

        lockoutUpdate = { lockoutUntil: lockoutDate };
      }

      await db.transaction(async (tx) => {
        await tx
          .update(otps)
          .set({ attempts: currentOtpAttempts })
          .where(eq(otps.id, otpRecord.id));

        await tx
          .update(users)
          .set({ failedAttempts: totalUserFailedAttempts, ...lockoutUpdate })
          .where(eq(users.id, userRecord.id));
      });

      throw {};
    }

    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ failedAttempts: 0, lockedUntil: null })
        .where(eq(users.id, userRecord.id));

      await tx
        .update(otps)
        .set({ usedAt: new Date(), expiresAt: new Date(Date.now() - 1000) })
        .where(eq(otps.id, otpRecord.id));
    });

    // Issue #2: Re-check user status before issuing tokens
    const blockedStatuses = ['banned'];
    if (blockedStatuses.includes(userRecord.authStatus!)) {
      throw {
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'ACCOUNT_BANNED',
      };
    }
    switch (otpRecord.type) {
      case 'REGISTRATION':
        return {
          register: (await this.registerHandler(
            userRecord.id,
            userRecord.email,
          )) as RegisterOTPResponse,
        };
      case 'LOGIN':
        return {
          login: (await this.loginHandler(
            userRecord,
            clientData,
          )) as LoginOTPResponse,
        };
      //   case 'EMAIL_CHANGE_CURRENT':
      //     return await oldEmailHandler(
      //       userRecord.id,
      //       userRecord.email,
      //       userRecord.firstName,
      //       userRecord.lastName,
      //       lang,
      //     );
      //   case 'EMAIL_CHANGE_NEW':
      //     return newEmailHandler(userRecord, clientData, rolesArray, lang);
      default:
        throw new RpcException({
          code: GrpcStatus.INVALID_ARGUMENT,
          message: 'INVALID_OTP_TYPE',
        });
    }
  }

  private async registerHandler(
    userId: string,
    email: string,
  ): Promise<RegisterOTPResponse> {
    await db
      .update(users)
      .set({ authStatus: 'verified' })
      .where(eq(users.id, userId));
    const tempToken = jwt.sign(
      {
        email: email,
        sub: userId,
        purpose: 'profile_completion',
      },
      process.env.JWT_TEMP_SECRET!,
      { expiresIn: ACCESS_TOKEN_EXPIRY },
    );
    return { verified: true, nextStep: 'complete_profile', tempToken };
  }

  private async loginHandler(
    userRecord: typeof users.$inferSelect,
    clientData: ClientData,
  ): Promise<LoginOTPResponse> {
    // 1. DEVICE LOGIC: Two-tier device identification
    //    Tier 1 (primary):  server-issued persistent device token (X-Device-Token header)
    //    Tier 2 (fallback): exact hash match, then fuzzy component match (merge when close)
    const fingerprint = clientData.deviceFingerprint || clientData.deviceInfo;
    const deviceHash = await hash(fingerprint);

    let device;

    // Tier 1: match by server-issued device token
    let dev = new DeviceFunction();
    if (clientData.deviceToken) {
      device = await dev.findDeviceByToken(
        userRecord.id,
        clientData.deviceToken!,
      );
    }

    if (!device) {
      device = await dev.findDeviceByHash(userRecord.id, deviceHash);
    }

    // Tier 2b: fuzzy match — hash differs but components are close (e.g. timezone/hw cap changed) → merge
    if (!device && clientData.fingerprintComponents) {
      device = await dev.findDeviceByHash(userRecord.id, deviceHash);
    }

    if (!device) {
      const userDevices = await dev.countActiveDevices(userRecord.id);
      if (userDevices[0].count >= MAX_DEVICES) {
        throw new RpcException({
          code: GrpcStatus.PERMISSION_DENIED,
          message: 'DEVICE_LIMIT_REACHED',
        });
      }
      device = await dev.registerDevice(userRecord.id, clientData!);
    } else if (device.revokedAt) {
      // Device was revoked — check MAX_DEVICES before re-activating
      const userDevices = await dev.countActiveDevices(userRecord.id);
      if (userDevices[0].count >= MAX_DEVICES) {
        throw new RpcException({
          code: GrpcStatus.PERMISSION_DENIED,
          message: 'DEVICE_LIMIT_REACHED',
        });
      }
      // Re-activate the device
      device = await dev.reactivateDevice(device.id);
    } else {
      await dev.touchDevice(device.id);
    }

    let session = new SessionFunction();

    const activeSessions = await session.countActiveSessions(
      userRecord.id,
      device.id,
    );

    if (activeSessions[0].count >= MAX_ACTIVE_SESSIONS) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'SESSION_LIMIT_REACHED',
      });
    }

    // 3. CREATE SESSION
    const refreshToken = randomBytes(40).toString('hex');
    const hashedRefreshToken = await hash(refreshToken);

    const newSession = await session.createSession({
      userId: userRecord.id,
      deviceId: device.id,
      ipAddress: clientData.ipAddress!,
      refreshTokenHash: hashedRefreshToken,
    });

    // 4. GENERATE TOKENS
    const accessToken = jwt.sign(
      {
        sub: userRecord.id,
        sid: newSession.sessionId,
        email: userRecord.email,
      },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: ACCESS_TOKEN_EXPIRY },
    );

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresIn: ACCESS_TOKEN_EXPIRY,
      refreshTokenExpiresIn: SESSION_LIFETIME_DAYS.toString() + 'd',
      user: {
        id: userRecord.id,
        email: userRecord.email,
        firstName: userRecord.firstName,
        lastName: userRecord.lastName,
        avatarUrl: userRecord.avatarUrl || null,
      },
      session: {
        sessionId: newSession.sessionId,
        deviceId: device.id,
      },
    };
  }

  private validateInput({ email, code }: VerifyOtp): void {
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

    const codeResult = validateRequired(code, 'OTP Code');
    if (!codeResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: codeResult.message,
      });
    }

    const codeFormatResult = validateOTP(code);
    if (!codeFormatResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: codeFormatResult.message,
      });
    }
  }

  private async fingerprintComponentsMatch(
    stored: FingerprintComponents | null,
    current: FingerprintComponents,
  ): Promise<boolean> {
    if (!stored) return false;
    if (
      stored.deviceName !== current.deviceName ||
      stored.platform !== current.platform
    )
      return false;

    let score = 0;

    // hardwareConcurrency: exact match or browser cap (current 2/4 and stored >= current)
    if (stored.hardwareConcurrency === current.hardwareConcurrency) {
      score += 1;
    } else if (
      [2, 4].includes(current.hardwareConcurrency) &&
      stored.hardwareConcurrency >= current.hardwareConcurrency
    ) {
      score += 1;
    }

    // timezone: exact match (both present)
    if (
      stored.timezone != null &&
      current.timezone != null &&
      stored.timezone === current.timezone
    )
      score += 1;

    // language: primary part match (e.g. "en" from "en-US")
    if (stored.language != null && current.language != null) {
      const storedLang = stored.language.split('-')[0].toLowerCase();
      const currentLang = current.language.split('-')[0].toLowerCase();
      if (storedLang === currentLang) score += 1;
    }

    return score >= MIN_SOFT_MATCHES_FOR_MERGE;
  }
}
