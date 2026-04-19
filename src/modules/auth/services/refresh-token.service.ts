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
import jwt from 'jsonwebtoken';
import { ACCESS_TOKEN_EXPIRY } from '../../../shared/constants/auth';
import { randomBytes } from 'crypto';

@Injectable()
export class RefreshTokenService {
  async refreshToken(data: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    let sessionFun = new SessionFunction();
    let userFun = new UserFunction();
    const { refreshToken } = data;
    // Validation
    this.validateInput(refreshToken);
    // Hash the refresh token to compare with stored hash
    const refreshHashed = await hash(refreshToken);
    // Find session by hashed refresh token
    const session = await sessionFun.findSessionByRefreshToken(refreshHashed);
    // If session not found or refresh token is invalid
    if (!session) {
      throw new RpcException({
        code: GrpcStatus.UNAUTHENTICATED,
        message: 'this sesstion is not exist or expired',
      });
    }
    // Check if session is expired
    if (session.expiresAt && new Date() > new Date(session.expiresAt)) {
      sessionFun.revokeSession(session.id);
      throw new RpcException({
        code: GrpcStatus.UNAUTHENTICATED,
        message: 'this sesstion is expired',
      });
    }
    // Find user by session userId
    const userRecord = (await userFun.findUserById(session.userId)) as UserInfo;
    // Check if user is banned
    if (userRecord.authStatus === 'banned') {
      sessionFun.revokeSession(session.id);
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message:
          'accaout is banned and your session is revoked please contact support',
      });
    }
    // Generate new access token
    const accessToken = jwt.sign(
      {
        sub: session.userId,
        sid: session.id,
        email: userRecord.email,
      },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: ACCESS_TOKEN_EXPIRY },
    );
    // Generate new refresh token and hash it
    const newRefreshToken = randomBytes(40).toString('hex');
    const newRefreshTokenHash = await hash(newRefreshToken);
    // Update session with new refresh token hash and last activity
    await sessionFun.updateSessionRefreshToken(session.id, newRefreshTokenHash);
    // Calculate remaining time for the session to set refresh token expiry
    const remainingTime = session.expiresAt.getTime() - new Date().getTime();
    const remainingDays = remainingTime / (1000 * 60 * 60 * 24);
    // Return new tokens and their expiry information
    return {
      accessToken: accessToken,
      refreshToken: newRefreshToken,
      accessTokenExpiresAt: ACCESS_TOKEN_EXPIRY,
      refreshTokenExpiresAt: remainingDays.toString() + 'd',
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
