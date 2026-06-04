import { Injectable } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { otps, users } from '../../../shared/db/schema';
import {
  ClientData,
  FingerprintComponents,
} from '../../../shared/types/auth/session';
import db from '../../../shared/configs/db.config';
import { hash } from '../../../shared/utils/hash';
import { signAccessToken } from '../../../shared/utils/jwt';
import {
  MAX_ACTIVE_SESSIONS,
  MAX_DEVICES,
  MIN_SOFT_MATCHES_FOR_MERGE,
  accessTokenExpiresAt,
  refreshTokenExpiresAt,
} from '../../../shared/constants/auth';
import { randomBytes } from 'crypto';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { VerifyOtpResponse, VerifyOtp } from '../../../shared/types/auth/otp';
import { DeviceFunction } from '../../../shared/func/device';
import { SessionFunction } from '../../../shared/func/session';
import {
  validateEmail,
  validateOTP,
  validateRequired,
} from '../../../shared/validations';

@Injectable()
export class OtpService {
  constructor(
    private readonly sessionFun: SessionFunction,
    private readonly deviceFun: DeviceFunction,
  ) {}
  async verifyOtp(
    data: VerifyOtp,
    clientData: ClientData,
  ): Promise<VerifyOtpResponse> {
    const { email, code } = data;

    this.validateInput(data);

    const validate = await db
      .select()
      .from(otps)
      .innerJoin(users, eq(otps.userId, users.id))
      .where(eq(users.email, email))
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

    // VALIDATIONS (no DB writes)
    if (
      userRecord.lockedUntil &&
      new Date() < new Date(userRecord.lockedUntil)
    ) {
      const remainingTime = Math.ceil(
        (new Date(userRecord.lockedUntil).getTime() - Date.now()) / 60000,
      );

      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: `account locked. Try again in ${remainingTime} minutes`,
      });
    }

    if (otpRecord.usedAt) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'OTP_ALREADY_USED',
      });
    }

    if ((otpRecord.attempts || 0) >= 3) {
      throw new RpcException({
        code: GrpcStatus.RESOURCE_EXHAUSTED,
        message: 'TOO_MANY_ATTEMPTS',
      });
    }

    if (new Date() > otpRecord.expiresAt) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'OTP_EXPIRED',
      });
    }

    const isValid = (await hash(code)) === otpRecord.code;
    // WRONG OTP FLOW (TRANSACTION)
    if (!isValid) {
      const currentOtpAttempts = (otpRecord.attempts || 0) + 1;
      const totalUserFailedAttempts = (userRecord.failedAttempts || 0) + 1;

      // Lockout logic: every 5 failed attempts → lock account with increasing duration (2min, 4min, 6min, etc.)
      const lockoutUntil =
        totalUserFailedAttempts % 5 === 0
          ? new Date(Date.now() + totalUserFailedAttempts * 2 * 60 * 1000)
          : null;

      await db.transaction(async (tx) => {
        await tx
          .update(otps)
          .set({ attempts: currentOtpAttempts })
          .where(eq(otps.id, otpRecord.id));

        await tx
          .update(users)
          .set({
            failedAttempts: totalUserFailedAttempts,
            ...(lockoutUntil ? { lockedUntil: lockoutUntil } : {}),
          })
          .where(eq(users.id, userRecord.id));
      });

      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: `INVALID_OTP. Attempt ${currentOtpAttempts}`,
      });
    }
    // SUCCESS FLOW (TRANSACTION)
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          failedAttempts: 0,
          lockedUntil: null,
        })
        .where(eq(users.id, userRecord.id));

      await tx
        .update(otps)
        .set({
          usedAt: new Date(),
          expiresAt: new Date(Date.now() - 1000),
        })
        .where(eq(otps.id, otpRecord.id));
    });
    // BUSINESS CHECK
    if (userRecord.authStatus === 'banned') {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'ACCOUNT_BANNED',
      });
    }
    // RESPONSE
    switch (otpRecord.type) {
      case 'REGISTRATION':
        return await this.registerHandler(userRecord, clientData);
      case 'LOGIN':
        return await this.loginHandler(userRecord, clientData);

      default:
        throw new RpcException({
          code: GrpcStatus.INVALID_ARGUMENT,
          message: 'INVALID_OTP_TYPE',
        });
    }
  }

  private async registerHandler(
    userRecord: typeof users.$inferSelect,
    clientData: ClientData,
  ): Promise<VerifyOtpResponse> {
    await db
      .update(users)
      .set({ authStatus: 'verified' })
      .where(eq(users.id, userRecord.id));

    if (!clientData.deviceFingerprint) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'DEVICE_FINGERPRINT_REQUIRED',
      });
    }

    const device = await this.deviceFun.registerDevice(
      userRecord.id,
      clientData,
    );

    const refreshToken = randomBytes(40).toString('hex');
    const hashedRefreshToken = await hash(refreshToken);

    const newSession = await this.sessionFun.createSession({
      userId: userRecord.id,
      deviceId: device.id,
      ipAddress: clientData.ipAddress!,
      refreshTokenHash: hashedRefreshToken,
    });

    const accessToken = await signAccessToken({
      sub: userRecord.id,
      deviceId: device.id,
      globalRole: userRecord.globalRole || 'user',
    });

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt: accessTokenExpiresAt(),
      refreshTokenExpiresAt: refreshTokenExpiresAt(),
      user: {
        id: userRecord.id,
        email: userRecord.email,
        firstName: userRecord.firstName,
        lastName: userRecord.lastName,
        avatarUrl: userRecord.avatarUrl ?? '',
      },
      session: {
        sessionId: newSession.sessionId,
        deviceId: device.id,
      },
    };
  }

  private async loginHandler(
    userRecord: typeof users.$inferSelect,
    clientData: ClientData,
  ): Promise<VerifyOtpResponse> {
    // 1. DEVICE LOGIC: Two-tier device identification
    //    Tier 1 (primary):  server-issued persistent device token (X-Device-Token header)
    //    Tier 2 (fallback): exact hash match, then fuzzy component match (merge when close)
    const fingerprint = clientData.deviceFingerprint;
    const deviceHash = await hash(fingerprint);

    if (!fingerprint) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'DEVICE_FINGERPRINT_MISSING',
      });
    }

    type DeviceLike = { id: string; revokedAt?: Date | null };
    let device: DeviceLike | null = null;

    // Tier 1: match by server-issued device token
    if (clientData.deviceToken) {
      device = (await this.deviceFun.findDeviceByToken(
        userRecord.id,
        clientData.deviceToken,
      )) as DeviceLike | null;
    }

    if (!device) {
      device = (await this.deviceFun.findDeviceByHash(
        userRecord.id,
        deviceHash,
      )) as DeviceLike | null;
    }

    // Tier 2b: fuzzy match — hash differs but components are close (e.g. timezone/hw cap changed) → merge
    if (!device && clientData.fingerprintComponents) {
      device = (await this.deviceFun.findDeviceByHash(
        userRecord.id,
        deviceHash,
      )) as DeviceLike | null;
    }

    if (!device) {
      const userDevices = await this.deviceFun.countActiveDevices(
        userRecord.id,
      );
      if (userDevices >= MAX_DEVICES) {
        throw new RpcException({
          code: GrpcStatus.PERMISSION_DENIED,
          message: 'DEVICE_LIMIT_REACHED',
        });
      }
      device = await this.deviceFun.registerDevice(userRecord.id, clientData);
    } else if (device.revokedAt) {
      // Device was revoked — check MAX_DEVICES before re-activating
      const userDevices = await this.deviceFun.countActiveDevices(
        userRecord.id,
      );
      if (userDevices >= MAX_DEVICES) {
        throw new RpcException({
          code: GrpcStatus.PERMISSION_DENIED,
          message: 'DEVICE_LIMIT_REACHED',
        });
      }
      // Re-activate the device
      await this.deviceFun.reactivateDevice(device.id);
    } else {
      await this.deviceFun.touchDevice(device.id);
    }

    const activeSessions = await this.sessionFun.countActiveSessions(
      userRecord.id,
      device.id,
    );

    if (activeSessions >= MAX_ACTIVE_SESSIONS) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'SESSION_LIMIT_REACHED',
      });
    }

    // 3. CREATE SESSION
    const refreshToken = randomBytes(40).toString('hex');
    const hashedRefreshToken = await hash(refreshToken);

    const newSession = await this.sessionFun.createSession({
      userId: userRecord.id,
      deviceId: device.id,
      ipAddress: clientData.ipAddress!,
      refreshTokenHash: hashedRefreshToken,
    });

    // 4. GENERATE TOKENS
    const accessToken = await signAccessToken({
      sub: userRecord.id,
      deviceId: device.id,
      globalRole: userRecord.globalRole || 'user',
    });

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt: accessTokenExpiresAt(),
      refreshTokenExpiresAt: refreshTokenExpiresAt(),
      user: {
        id: userRecord.id,
        email: userRecord.email,
        firstName: userRecord.firstName,
        lastName: userRecord.lastName,
        avatarUrl: userRecord.avatarUrl ?? '',
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

  private fingerprintComponentsMatch(
    stored: FingerprintComponents | null,
    current: FingerprintComponents,
  ): boolean {
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
