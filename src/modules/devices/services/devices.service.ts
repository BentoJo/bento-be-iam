import { Injectable } from '@nestjs/common';
import db from '../../../shared/configs/db.config';
import { devices, sessions } from '../../../shared/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { DeviceInfo } from '../../../shared/types/devices/devices';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';

@Injectable()
export class DevicesService {
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
        deviceName: device.deviceName,
        firstSeenAt: device.firstSeenAt,
        lastSeenAt: device.lastSeenAt,
        isCurrent: currentDeviceId ? device.id === currentDeviceId : false,
        isActive: device.revokedAt === null,
      })) as DeviceInfo[];
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

      const result = await db
        .update(devices)
        .set({ revokedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(devices.id, deviceId),
            eq(devices.userId, userId),
            isNull(devices.revokedAt),
          ),
        )
        .returning({ id: devices.id });

      if (result.length === 0) {
        throw new RpcException({
          code: GrpcStatus.NOT_FOUND,
          message: 'Device not found or already revoked',
        });
      }

      await db
        .update(sessions)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(sessions.userId, userId),
            eq(sessions.deviceId, deviceId),
            isNull(sessions.revokedAt),
          ),
        );
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

  async revokeAllOtherDevicesService(userId: string): Promise<number> {
    try {
      const result = await db
        .update(devices)
        .set({ revokedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(devices.userId, userId), isNull(devices.revokedAt)))
        .returning({ id: devices.id });

      await db
        .update(sessions)
        .set({ revokedAt: new Date() })
        .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));

      return result.length;
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
