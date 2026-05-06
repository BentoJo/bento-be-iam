import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  ensureActiveJwtKey,
  revokeExpiredGraceKeys,
  rotateActiveJwtKey,
} from '../../../shared/func/keys';

const ROTATION_INTERVAL_MS = 15 * 60 * 1000;

@Injectable()
export class KeyRotationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KeyRotationService.name);
  private intervalHandle: NodeJS.Timeout | null = null;
  private isRunning = false;

  async onModuleInit(): Promise<void> {
    await ensureActiveJwtKey();
    await revokeExpiredGraceKeys();

    this.intervalHandle = setInterval(() => {
      void this.runRotationCycle();
    }, ROTATION_INTERVAL_MS);

    this.logger.log('JWT key rotation scheduler started (every 15 minutes).');
  }

  onModuleDestroy(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  private async runRotationCycle(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn(
        'Skipping key rotation cycle because previous cycle is still running.',
      );
      return;
    }

    this.isRunning = true;

    try {
      const nextKey = await rotateActiveJwtKey();
      const revokedCount = await revokeExpiredGraceKeys();

      this.logger.log(
        `JWT key rotation completed. New active kid: ${nextKey.kid}. Revoked expired grace keys: ${revokedCount}.`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`JWT key rotation failed: ${message}`);
    } finally {
      this.isRunning = false;
    }
  }
}
