import { Injectable } from '@nestjs/common';
import {
  RefreshTokenRequest,
  RefreshTokenResponse,
} from '../../../shared/types/auth/refresh-token';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { validateRequired } from '../../../shared/validations';
import { hash } from '../../../shared/utils/hash';
import { SessionFunction } from '../../../shared/func/session';
import { UserFunction } from '../../../shared/func/users';
import { UserInfo } from '../../../shared/types/users/users';
import { signAccessToken } from '../../../shared/utils/jwt';
import {
  accessTokenExpiresAt,
  refreshTokenExpiresAt,
} from '../../../shared/constants/auth';

@Injectable()
export class RefreshTokenService {
  constructor(
    private readonly sessionFun: SessionFunction,
    private readonly userFun: UserFunction,
  ) {}
  async refreshToken(data: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    const { refreshToken } = data;
    // Validation
    this.validateInput(refreshToken);
    // Hash the refresh token to compare with stored hash
    const refreshHashed = await hash(refreshToken);
    // Find session by hashed refresh token
    const session =
      await this.sessionFun.findSessionByRefreshToken(refreshHashed);
    // If session not found or refresh token is invalid
    if (!session) {
      throw new RpcException({
        code: GrpcStatus.UNAUTHENTICATED,
        message: 'this sesstion is not exist or expired',
      });
    }
    // Check if session is expired
    if (session.expiresAt && new Date() > new Date(session.expiresAt)) {
      await this.sessionFun.revokeSession(session.id);
      throw new RpcException({
        code: GrpcStatus.UNAUTHENTICATED,
        message: 'this sesstion is expired',
      });
    }
    // Find user by session userId
    const userRecord = (await this.userFun.findUserById(
      session.userId,
    )) as UserInfo;
    // Check if user is banned
    if (userRecord.authStatus === 'banned') {
      await this.sessionFun.revokeSession(session.id);
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message:
          'accaout is banned and your session is revoked please contact support',
      });
    }
    // Generate new access token
    const accessToken = await signAccessToken({
      sub: session.userId,
      deviceId: session.deviceId,
      globalRole: userRecord.globalRole || 'user',
    });

    // Deliberately DO NOT rotate the refresh token.
    //
    // The frontend refreshes through next-auth's jwt callback, which calls the
    // gateway server-to-server. Any rotated cookie the gateway sets in that
    // response lands on the Next.js server, never on the browser — so a rotated
    // token would be lost and the *next* refresh would fail with UNAUTHENTICATED.
    // Keeping the token stable makes every refresh path idempotent. We slide the
    // session's lastActivity instead so it stays "active".
    await this.sessionFun.touchSession(session.id, session.deviceId);

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt: accessTokenExpiresAt(),
      refreshTokenExpiresAt: refreshTokenExpiresAt(),
    };
  }

  private validateInput(refreshToken: string): void {
    const requiredResult = validateRequired(refreshToken, 'Refresh Token');
    if (!requiredResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: requiredResult.message,
      });
    }
  }
}
