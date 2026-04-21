import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { DevicesService } from './services/devices.service';

@Controller()
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @GrpcMethod('DevicesService', 'ListDevices')
  listDevice(data: { userId: string; currentDeviceId?: string }) {
    return this.devicesService.listDevicesService(
      data.userId,
      data.currentDeviceId,
    );
  }

  @GrpcMethod('DevicesService', 'RevokeDevice')
  revokeDevice(data: {
    userId: string;
    deviceId: string;
    currentDeviceId?: string;
  }) {
    return this.devicesService.revokeDeviceService(
      data.userId,
      data.deviceId,
      data.currentDeviceId,
    );
  }

  @GrpcMethod('DevicesService', 'RevokeAllOtherDevices')
  revokeAllOtherDevices(data: { userId: string }) {
    return this.devicesService.revokeAllOtherDevicesService(data.userId);
  }
}
