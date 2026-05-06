import { Injectable } from '@nestjs/common';
import { SessionFunction } from '../../../shared/func/session';
import {
  LogoutRequest,
  LogoutResponse,
} from '../../../shared/types/auth/logout';

@Injectable()
export class LogoutService {
  constructor(private readonly sessionFunction: SessionFunction) {}
  async logout(data: LogoutRequest): Promise<LogoutResponse> {
    const { refreshToken } = data;
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
}
