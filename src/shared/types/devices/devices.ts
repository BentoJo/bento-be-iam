export interface DeviceInfo {
  id: string;
  deviceName: string | null;
  firstSeenAt: Date;
  lastSeenAt: Date | null;
  isCurrent: boolean;
  isActive: boolean;
}

export interface ClientData {
  deviceFingerprint: string;
  deviceInfo: string;
  location: string;
  ipAddress?: string;
  deviceToken?: string | null;
  fingerprintComponents?: FingerprintComponents | null;
}

export interface FingerprintComponents {
  deviceName: string;
  platform: string;
  hardwareConcurrency: number;
}
