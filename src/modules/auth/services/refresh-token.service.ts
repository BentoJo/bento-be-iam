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
import { randomBytes } from 'crypto';
import {
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY,
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
      this.sessionFun.revokeSession(session.id, session.deviceId);
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
      this.sessionFun.revokeSession(session.id, session.deviceId);
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message:
          'accaout is banned and your session is revoked please contact support',
      });
    }
    // Generate new access token
    const accessToken = signAccessToken({
      sub: session.userId,
      deviceId: session.deviceId,
      globalRole: userRecord.globalRole || 'user',
    });
    // Generate new refresh token and hash it
    const newRefreshToken = randomBytes(40).toString('hex');
    const newRefreshTokenHash = await hash(newRefreshToken);
    // Update session with new refresh token hash and last activity
    await this.sessionFun.updateSessionRefreshToken(
      session.id,
      newRefreshTokenHash,
    );
    // Calculate remaining time for the session to set refresh token expiry
    const remainingTime = session.expiresAt.getTime() - new Date().getTime();
    const remainingDays = remainingTime / (1000 * 60 * 60 * 24);
    // Return new tokens and their expiry information
    return {
      accessToken: accessToken,
      refreshToken: newRefreshToken,
      accessTokenExpiresAt: ACCESS_TOKEN_EXPIRY,
      refreshTokenExpiresAt: REFRESH_TOKEN_EXPIRY,
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
