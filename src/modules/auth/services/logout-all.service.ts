import { Injectable } from '@nestjs/common';
import { SessionFunction } from '../../../shared/func/session';
import {
  LogoutAllRequest,
  LogoutAllResponse,
} from '../../../shared/types/auth/logout';
import { validateRequired, validateUUID } from '../../../shared/validations';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class LogoutAllService {
  constructor(private readonly sessionFunction: SessionFunction) {}
  async logoutAll(data: LogoutAllRequest): Promise<LogoutAllResponse> {
    const { userId } = data;

    // Validate input
    this.validateInput(userId);

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

  private validateInput(userId: string): void {
    const requiredResult = validateRequired(userId, 'User ID');
    if (!requiredResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: requiredResult.message,
      });
    }

    const userIdResult = validateUUID(userId, 'User ID');
    if (!userIdResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: userIdResult.message,
      });
    }
  }
}
