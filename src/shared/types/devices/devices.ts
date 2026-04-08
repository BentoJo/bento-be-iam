export interface DeviceInfo {
  id: string;
  deviceName: string | null;
  firstSeenAt: Date;
  lastSeenAt: Date | null;
  isCurrent: boolean;
  isActive: boolean;
}
