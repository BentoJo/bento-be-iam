import { Module } from '@nestjs/common';

import { SessionsController } from './sessions.controller';
import { SessionService } from './services/sessions.service';
import { SessionFunction } from '../../shared/func/session';

@Module({
  controllers: [SessionsController],
  providers: [SessionService, SessionFunction],
  exports: [SessionService],
})
export class SessionsModule {}
