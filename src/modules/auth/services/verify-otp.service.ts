import { Injectable } from '@nestjs/common';
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
import { RegisterOTPResponse } from '../../../shared/types/auth/otp';

@Injectable()
export class OtpService {
  async verifyOtp(data: {
    email: string;
    code: string;
    clientData?: ClientData;
  }): Promise<{
    // login?: LoginOTPResponse;
    register?: RegisterOTPResponse;
  }> {
    const { email, code } = data;
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
        message: 'ACCOUNT_LOCKED',
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

    // const userRolesList = await db
    //   .select({ id: userRoles.roleId, role: roles.nameEn })
    //   .from(userRoles)
    //   .where(eq(userRoles.userId, userRecord.id))
    //   .leftJoin(roles, eq(userRoles.roleId, roles.id));

    // const rolesArray = userRolesList
    //   .map((r) => r.role)
    //   .filter(Boolean) as string[];
    switch (otpRecord.type) {
      case 'REGISTRATION':
        return {
          register: await this.registerHandler(userRecord.id, userRecord.email),
        };
      // case 'LOGIN':
      //   await this.loginHandler(userRecord, clientData!);
      //   case 'RECOVERY':
      //     return await RecoveryHandler(userRecord.id);
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
  ) {
    // 1. DEVICE LOGIC: Two-tier device identification
    //    Tier 1 (primary):  server-issued persistent device token (X-Device-Token header)
    //    Tier 2 (fallback): exact hash match, then fuzzy component match (merge when close)
    const fingerprint = clientData.deviceFingerprint || clientData.deviceInfo;
    const deviceHash = await hash(fingerprint);

    let device: typeof devices.$inferSelect | undefined;

    // Tier 1: match by server-issued device token
    if (clientData.deviceToken) {
      [device] = await db
        .select()
        .from(devices)
        .where(
          and(
            eq(devices.userId, userRecord.id),
            eq(devices.id, clientData.deviceToken),
          ),
        )
        .limit(1);
    }

    // Tier 2a: exact hash match (covers private/incognito and cross-browser when fingerprint unchanged)
    if (!device) {
      [device] = await db
        .select()
        .from(devices)
        .where(
          and(
            eq(devices.userId, userRecord.id),
            eq(devices.deviceFingerprintHash, deviceHash),
          ),
        )
        .limit(1);
    }

    // Tier 2b: fuzzy match — hash differs but components are close (e.g. timezone/hw cap changed) → merge
    if (!device && clientData.fingerprintComponents) {
      const userDevicesList = await db
        .select()
        .from(devices)
        .where(
          and(eq(devices.userId, userRecord.id), isNull(devices.revokedAt)),
        );
      const merged = userDevicesList.find((d) =>
        this.fingerprintComponentsMatch(
          d.fingerprintComponents,
          clientData.fingerprintComponents!,
        ),
      );
      if (merged) {
        await db
          .update(devices)
          .set({
            deviceFingerprintHash: deviceHash,
            fingerprintComponents: clientData.fingerprintComponents,
            lastSeenAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(devices.id, merged.id));
        [device] = await db
          .select()
          .from(devices)
          .where(eq(devices.id, merged.id))
          .limit(1);
      }
    }

    if (!device) {
      const userDevices = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(devices)
        .where(
          and(eq(devices.userId, userRecord.id), isNull(devices.revokedAt)),
        );

      if (userDevices[0].count >= MAX_DEVICES) {
        throw {};
      }

      [device] = await db
        .insert(devices)
        .values({
          userId: userRecord.id,
          deviceFingerprintHash: deviceHash,
          deviceName: clientData.deviceInfo,
          fingerprintComponents: clientData.fingerprintComponents ?? undefined,
          firstSeenAt: new Date(),
          lastSeenAt: new Date(),
        })
        .returning();
    } else if (device.revokedAt) {
      // Device was revoked — check MAX_DEVICES before re-activating
      const userDevices = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(devices)
        .where(
          and(eq(devices.userId, userRecord.id), isNull(devices.revokedAt)),
        );

      if (userDevices[0].count >= MAX_DEVICES) {
        throw new RpcException({
          code: GrpcStatus.PERMISSION_DENIED, //
          message: 'DEVICE_LIMIT_REACHED',
        });
      }

      // Re-activate the device
      [device] = await db
        .update(devices)
        .set({ revokedAt: null, lastSeenAt: new Date(), updatedAt: new Date() })
        .where(eq(devices.id, device.id))
        .returning();
    } else {
      await db
        .update(devices)
        .set({ lastSeenAt: new Date() })
        .where(eq(devices.id, device.id));
    }

    const activeSessions = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(sessions)
      .where(
        and(
          eq(sessions.userId, userRecord.id),
          eq(sessions.deviceId, device.id),
          isNull(sessions.revokedAt),
        ),
      );

    if (activeSessions[0].count >= MAX_ACTIVE_SESSIONS) {
      throw {};
    }

    // 3. CREATE SESSION
    const refreshToken = randomBytes(40).toString('hex');
    const hashedRefreshToken = await hash(refreshToken);

    // Issue #11: Set absolute session expiry (40 days)
    const sessionExpiresAt = new Date();
    sessionExpiresAt.setDate(
      sessionExpiresAt.getDate() + SESSION_LIFETIME_DAYS,
    );

    const [newSession] = await db
      .insert(sessions)
      .values({
        userId: userRecord.id,
        deviceId: device.id,
        ipAddress: clientData.ipAddress,
        refreshTokenHash: hashedRefreshToken,
        lastActivity: new Date(),
      })
      .returning();

    // 4. GENERATE TOKENS
    const accessToken = jwt.sign(
      { sub: userRecord.id, sid: newSession.id, email: userRecord.email },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: ACCESS_TOKEN_EXPIRY },
    );

    return {
      accessToken,
      refreshToken,
      data: {
        user: {
          id: userRecord.id,
          email: userRecord.email,
          firstName: userRecord.firstName,
          lastName: userRecord.lastName,
          avatarUrl: userRecord.avatarUrl || null,
        },
        session: {
          sessionId: newSession.id,
          deviceId: device.id,
        },
      },
    };
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
