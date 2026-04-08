import { Injectable } from '@nestjs/common';
import { SessionInfo } from '../../../shared/types/sessions/sessions';
import db from '../../../shared/configs/db.config';
import { sessions } from '../../../shared/db/schema';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';

@Injectable()
export class SessionService {
  async listSessionsService(
    userId: string,
    currentSessionId: string,
  ): Promise<SessionInfo[]> {
    const sessionsList = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)))
      .orderBy(desc(sessions.lastActivity));

    return sessionsList.map((session) => ({
      id: session.id,
      ipAddress: session.ipAddress,
      lastActivity: session.lastActivity,
      isCurrent: session.id === currentSessionId,
      createdAt: session.createdAt,
    }));
  }

  async revokeSessionService(sessionId: string, userId: string): Promise<void> {
    const result = await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(sessions.id, sessionId),
          eq(sessions.userId, userId),
          isNull(sessions.revokedAt),
        ),
      )
      .returning({ id: sessions.id });

    if (result.length === 0) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'Session not found or already revoked',
      });
    }
  }
}
