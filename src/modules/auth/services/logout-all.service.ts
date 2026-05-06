import { Injectable } from '@nestjs/common';
import { SessionFunction } from '../../../shared/func/session';
import {
  LogoutAllRequest,
  LogoutAllResponse,
} from '../../../shared/types/auth/logout';

@Injectable()
export class LogoutAllService {
  constructor(private readonly sessionFunction: SessionFunction) {}
  async logoutAll(data: LogoutAllRequest): Promise<LogoutAllResponse> {
    const { userId } = data;
    return this.sessionFunction
      .revokeAllSessionsForUser(userId)
      .catch((error) => {
        return {
          success: false,
          message:
            'Failed to log out from all sessions: ' +
            (error instanceof Error ? error.message : String(error)),
        };
      })
      .then(() => {
        return {
          success: true,
          message: 'Logged out from all sessions successfully',
        };
      });
  }
}
