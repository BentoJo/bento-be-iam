import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { SessionService } from './services/sessions.service';

@Controller()
export class SessionsController {
  constructor(private readonly sessionsService: SessionService) {}

  @GrpcMethod('SessionsService', 'ListSessions')
  listSessions(data: { userId: string; currentSessionId: string }) {
    return this.sessionsService.listSessionsService(
      data.userId,
      data.currentSessionId,
    );
  }

  @GrpcMethod('SessionsService', 'RevokeSession')
  revokeSession(data: { sessionId: string; userId: string }) {
    return this.sessionsService.revokeSessionService(
      data.sessionId,
      data.userId,
    );
  }
}
