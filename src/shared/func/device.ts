import { Injectable } from '@nestjs/common';

@Injectable()
export class DeviceFunction {
  async registerDevice(
    userId: string,
    deviceId: string,
    deviceInfo: any,
  ): Promise<void> {}

  async reactivateDevice(deviceId: string): Promise<void> {}

  async touchDevice(deviceId: string): Promise<void> {}

  async countActiveDevices(userId: string): Promise<number> {}

  async revokeDevice(deviceId: string): Promise<void> {}

  private async findDeviceByToken(
    userId: string,
    deviceToken: string,
  ): Promise<any> {}

  private async findDeviceByHash(
    userId: string,
    deviceHash: string,
  ): Promise<any> {}

  private async findDeviceByFuzzyMatch(
    userId: string,
    deviceInfo: any,
  ): Promise<any> {}
}
