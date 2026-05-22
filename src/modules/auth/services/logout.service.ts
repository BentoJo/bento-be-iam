import { Injectable } from '@nestjs/common';
import { SessionFunction } from '../../../shared/func/session';
import {
  LogoutRequest,
  LogoutResponse,
} from '../../../shared/types/auth/logout';
import { validateRequired } from '../../../shared/validations';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';
@Injectable()
export class LogoutService {
  constructor(private readonly sessionFunction: SessionFunction) {}
  async logout(data: LogoutRequest): Promise<LogoutResponse> {
    const { refreshToken } = data;

    // Validate input
    this.validateInput(refreshToken);

    return await this.sessionFunction
      .revokeSessionByRefreshToken(refreshToken)
      .then(() => {
        return {
          success: true,
          message: 'Logged out successfully',
        };
      });
  }

  async logoutBySessionId(sessionId: string) {
    return this.sessionFunction.revokeSession(sessionId);
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
