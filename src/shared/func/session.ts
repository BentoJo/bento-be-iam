import { Injectable } from '@nestjs/common';
import { and, asc, eq, isNull } from 'drizzle-orm';

import db from '../configs/db.config';
import { sessions } from '../db/schema';
import {
  CreateSessionRequest,
  CreateSessionResponse,
  SessionInfo,
} from '../types/sessions/sessions';
import { MAX_ACTIVE_SESSIONS } from '../types/constants/auth';

@Injectable()
export class SessionFunction {
  async createSession({
    userId,
    deviceId,
    ipAddress,
    refreshTokenHash,
  }: CreateSessionRequest): Promise<CreateSessionResponse> {
    try {
      const activeSessionCount = await this.countActiveSessions(
        userId,
        deviceId,
      );

      if (activeSessionCount >= MAX_ACTIVE_SESSIONS) {
        throw new Error(
          'Maximum number of sessions reached for this user and device',
        );
      }

      const newSession = await db
        .insert(sessions)
        .values({
          userId,
          deviceId,
          ipAddress,
          refreshTokenHash,
          lastActivity: new Date(),
        })
        .returning({ id: sessions.id });

      if (newSession.length === 0) {
        throw new Error('Failed to create session');
      }

      return { sessionId: newSession[0].id };
    } catch (error) {
      throw new Error(
        'Error creating session: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  async touchSession(sessionId: string, deviceId: string): Promise<void> {
    try {
      const updatedSession = await db
        .update(sessions)
        .set({ lastActivity: new Date() })
        .where(
          and(
            eq(sessions.id, sessionId),
            eq(sessions.deviceId, deviceId),
            isNull(sessions.revokedAt),
          ),
        )
        .returning({ id: sessions.id });

      if (updatedSession.length === 0) {
        throw new Error('Session not found or already revoked');
      }
    } catch (error) {
      throw new Error(
        'Error updating session activity: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  async revokeSession(sessionId: string): Promise<void> {
    try {
      const revokedSession = await db
        .update(sessions)
        .set({ revokedAt: new Date() })
        .where(and(eq(sessions.id, sessionId), isNull(sessions.revokedAt)))
        .returning({ id: sessions.id });

      if (revokedSession.length === 0) {
        throw new Error('Session not found or already revoked');
      }
    } catch (error) {
      throw new Error(
        'Error deleting session: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  async revokeOldestSession(userId: string, deviceId: string): Promise<void> {
    try {
      const sessionsToRevoke = await db
        .select()
        .from(sessions)
        .where(
          and(
            eq(sessions.userId, userId),
            eq(sessions.deviceId, deviceId),
            isNull(sessions.revokedAt),
          ),
        )
        .orderBy(asc(sessions.lastActivity), asc(sessions.createdAt))
        .limit(1);

      if (sessionsToRevoke.length === 0) {
        return;
      }

      await this.revokeSession(sessionsToRevoke[0].id);
    } catch (error) {
      throw new Error(
        'Error revoking oldest session: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  async revokeAllSessionsForDevice(
    userId: string,
    deviceId: string,
  ): Promise<void> {
    try {
      await db
        .update(sessions)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(sessions.userId, userId),
            eq(sessions.deviceId, deviceId),
            isNull(sessions.revokedAt),
          ),
        );
    } catch (error) {
      throw new Error(
        'Error revoking sessions for device: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  async revokeAllSessionsForUser(userId: string): Promise<void> {
    try {
      await db
        .update(sessions)
        .set({ revokedAt: new Date() })
        .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
    } catch (error) {
      throw new Error(
        'Error revoking sessions for user: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  async findSessionByUserId(
    userId: string,
    deviceId: string,
  ): Promise<SessionInfo[] | null> {
    try {
      const sessionRows = await db
        .select()
        .from(sessions)
        .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));

      if (sessionRows.length === 0) {
        return null;
      }

      return sessionRows.map((session) => ({
        id: session.id,
        userId: session.userId,
        deviceId: session.deviceId,
        ipAddress: session.ipAddress,
        refreshTokenHash: session.refreshTokenHash,
        lastActivity: session.lastActivity,
        isCurrent: deviceId ? session.deviceId === deviceId : false,
        revokedAt: session.revokedAt,
        createdAt: session.createdAt,
      }));
    } catch (error) {
      throw new Error(
        'Error finding session by user ID: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  async findSessionByDeviceId(
    userId: string,
    deviceId: string,
  ): Promise<SessionInfo[] | null> {
    try {
      const sessionRows = await db
        .select()
        .from(sessions)
        .where(
          and(
            eq(sessions.userId, userId),
            eq(sessions.deviceId, deviceId),
            isNull(sessions.revokedAt),
          ),
        );

      if (sessionRows.length === 0) {
        return null;
      }

      return sessionRows.map((session) => ({
        id: session.id,
        userId: session.userId,
        deviceId: session.deviceId,
        ipAddress: session.ipAddress,
        refreshTokenHash: session.refreshTokenHash,
        lastActivity: session.lastActivity,
        isCurrent: deviceId ? session.deviceId === deviceId : false,
        revokedAt: session.revokedAt,
        createdAt: session.createdAt,
      }));
    } catch (error) {
      throw new Error(
        'Error finding session by device ID: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  private async countActiveSessions(
    userId: string,
    deviceId: string,
  ): Promise<number> {
    const activeSessions = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(
        and(
          eq(sessions.userId, userId),
          eq(sessions.deviceId, deviceId),
          isNull(sessions.revokedAt),
        ),
      );

    return activeSessions.length;
  }

  private async findSessionByRefreshToken(
    hashedToken: string,
  ): Promise<SessionInfo | null> {
    const sessionRows = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.refreshTokenHash, hashedToken),
          isNull(sessions.revokedAt),
        ),
      )
      .limit(1);

    if (sessionRows.length === 0) {
      return null;
    }

    const session = sessionRows[0];

    return {
      id: session.id,
      userId: session.userId,
      deviceId: session.deviceId,
      ipAddress: session.ipAddress,
      refreshTokenHash: session.refreshTokenHash,
      lastActivity: session.lastActivity,
      isCurrent: false,
      revokedAt: session.revokedAt,
      createdAt: session.createdAt,
    };
  }
}
