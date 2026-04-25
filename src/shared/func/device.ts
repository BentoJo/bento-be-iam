import { Injectable } from '@nestjs/common';
import db from '../configs/db.config';
import { devices } from '../db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { ClientData, DeviceInfo } from '../types/devices/devices';
import { hash } from '../utils/hash';

@Injectable()
export class DeviceFunction {
  async registerDevice(
    userId: string,
    deviceInfo: ClientData,
  ): Promise<DeviceInfo> {
    try {
      //Put From Const Folder here
      if ((await this.countActiveDevices(userId)) >= 2) {
        throw new Error('Maximum number of devices reached for this user');
      }

      const deviceHash = await hash(deviceInfo.deviceFingerprint);

      const device = await db
        .insert(devices)
        .values({
          userId,
          deviceFingerprintHash: deviceHash,
          deviceName:
            deviceInfo.fingerprintComponents?.deviceName ||
            deviceInfo.deviceInfo,
          firstSeenAt: new Date(),
          lastSeenAt: new Date(),
        })
        .returning();

      return {
        ...device[0],
        isCurrent: true,
        isActive: true,
      };
    } catch (error) {
      throw new Error(
        'Error registering device: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  async reactivateDevice(deviceId: string): Promise<void> {
    try {
      await db
        .update(devices)
        .set({ revokedAt: null, lastSeenAt: new Date(), updatedAt: new Date() })
        .where(eq(devices.id, deviceId));
    } catch (error) {
      throw new Error(
        'Error reactivating device: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  async touchDevice(deviceId: string): Promise<void> {
    try {
      await db
        .update(devices)
        .set({ lastSeenAt: new Date() })
        .where(eq(devices.id, deviceId));
    } catch (error) {
      throw new Error(
        'Error touching device: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  async countActiveDevices(userId: string): Promise<number> {
    const activeDevices = await db
      .select()
      .from(devices)
      .where(and(eq(devices.userId, userId), isNull(devices.revokedAt)));

    return activeDevices.length;
  }

  async revokeDevice(deviceId: string): Promise<void> {
    try {
      const result = await db
        .update(devices)
        .set({ revokedAt: new Date() })
        .where(and(eq(devices.id, deviceId), isNull(devices.revokedAt)))
        .returning({ id: devices.id });

      if (result.length === 0) {
        throw new Error('Device not found or already revoked');
      }
    } catch (error) {
      throw new Error(
        'Error revoking device: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  async revokeAllDevicesForUser(userId: string): Promise<void> {
    try {
      const result = await db
        .update(devices)
        .set({ revokedAt: new Date() })
        .where(eq(devices.userId, userId))
        .returning({ id: devices.id });

      if (result.length === 0) {
        throw new Error('Device not found or already revoked');
      }
    } catch (error) {
      throw new Error(
        'Error revoking device: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  async findDeviceByToken(
    userId: string,
    deviceToken: string,
  ): Promise<DeviceInfo | null> {
    try {
      const deviceRows = await db
        .select()
        .from(devices)
        .where(and(eq(devices.userId, userId), eq(devices.id, deviceToken)))
        .limit(1);

      if (deviceRows.length === 0) {
        return null;
      }

      const device = deviceRows[0];

      return {
        ...device,
        isCurrent: device.id === deviceToken,
        isActive: device.revokedAt === null,
      };
    } catch (error) {
      throw new Error(
        'Error finding device by token: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  async findDeviceByHash(
    userId: string,
    deviceHash: string,
  ): Promise<DeviceInfo | null> {
    try {
      const deviceRows = await db
        .select()
        .from(devices)
        .where(
          and(
            eq(devices.userId, userId),
            eq(devices.deviceFingerprintHash, deviceHash),
            isNull(devices.revokedAt),
          ),
        )
        .limit(1);

      if (deviceRows.length === 0) {
        return null;
      }

      const device = deviceRows[0];

      return {
        ...device,
        isCurrent: false,
        isActive: device.revokedAt === null,
      };
    } catch (error) {
      throw new Error(
        'Error finding device by hash: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  async findDeviceByFuzzyMatch(
    userId: string,
    deviceInfo: ClientData,
  ): Promise<DeviceInfo | null> {
    try {
      const foundDevices = await db
        .select()
        .from(devices)
        .where(and(eq(devices.userId, userId), isNull(devices.revokedAt)));

      const matchedDevice = foundDevices.find((device) => {
        return (
          device.deviceName === deviceInfo.fingerprintComponents?.deviceName ||
          device.deviceFingerprintHash === deviceInfo.deviceFingerprint
        );
      });

      if (!matchedDevice) {
        return null;
      }

      return {
        ...matchedDevice,
        isCurrent: false,
        isActive: matchedDevice.revokedAt === null,
      };
    } catch (error) {
      throw new Error(
        'Error finding device by fuzzy match: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }
}
