import { Module } from '@nestjs/common';

import { DevicesController } from './devices.controller';
import { DevicesService } from './services/devices.service';
import { DeviceFunction } from '../../shared/func/device';
import { SessionFunction } from '../../shared/func/session';

@Module({
  controllers: [DevicesController],
  providers: [DevicesService, DeviceFunction, SessionFunction],
  exports: [DevicesService],
})
export class DevicesModule {}
