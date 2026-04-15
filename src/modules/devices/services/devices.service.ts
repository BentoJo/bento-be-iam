import { Injectable } from '@nestjs/common';
import db from '../../../shared/configs/db.config';
import { devices } from '../../../shared/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { DeviceInfo } from '../../../shared/types/devices/devices';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { DeviceFunction } from '../../../shared/func/device';
import { SessionFunction } from '../../../shared/func/session';

@Injectable()
export class DevicesService {
  constructor(
    private readonly deviceFunction: DeviceFunction,
    private readonly sessionFunction: SessionFunction,
  ) {}

  async listDevicesService(
    userId: string,
    currentDeviceId?: string,
  ): Promise<DeviceInfo[]> {
    try {
      const devicesList = await db
        .select()
        .from(devices)
        .where(and(eq(devices.userId, userId), isNull(devices.revokedAt)));

      return devicesList.map((device) => ({
        id: device.id,
        deviceFingerprintHash: device.deviceFingerprintHash,
        deviceName: device.deviceName,
        firstSeenAt: device.firstSeenAt,
        lastSeenAt: device.lastSeenAt,
        isCurrent: currentDeviceId ? device.id === currentDeviceId : false,
        isActive: device.revokedAt === null,
        createdAt: device.createdAt,
        updatedAt: device.updatedAt,
        revokedAt: device.revokedAt,
      }));
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: `Failed to revoke device ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  async revokeDeviceService(
    userId: string,
    deviceId: string,
    currentDeviceId?: string,
  ): Promise<void> {
    try {
      if (currentDeviceId && deviceId === currentDeviceId) {
        throw new RpcException({
          code: GrpcStatus.FAILED_PRECONDITION,
          message: 'Cannot revoke the current device',
        });
      }

      await this.deviceFunction.revokeDevice(deviceId);

      await this.sessionFunction.revokeAllSessionsForDevice(userId, deviceId);
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: `Failed to revoke device ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  async revokeAllOtherDevicesService(userId: string): Promise<void> {
    try {
      await this.deviceFunction.revokeAllDevicesForUser(userId);

      await this.sessionFunction.revokeAllSessionsForUser(userId);
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: `Failed to revoke device ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }
}
