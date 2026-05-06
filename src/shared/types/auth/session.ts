import { otpTypeEnum } from '../../db/schema';

export type OtpType = (typeof otpTypeEnum.enumValues)[number];

export interface ClientContext {
  ipAddress: string;
  userAgent: string;
  platform: string;
  deviceType: string;
  deviceFingerPrint: string;
  deviceName: string;

  devicePlatform: string;
  deviceHardwareConcurrency: number;
  deviceTimezone: string;
  deviceLanguage: string;

  deviceToken: string;
  clientVersion: string;
  timezone: string;

  requestId: string;
  sessionId: string;
}

export interface ClientData {
  deviceFingerprint: string;
  deviceInfo: string;
  location: string;
  ipAddress?: string;
  /** Server-issued persistent device ID (from X-Device-Token header). Primary identifier; fingerprint is the fallback. */
  deviceToken?: string | null;
  /** For Tier 2 merge: compare with stored components when hash does not match. */
  fingerprintComponents?: FingerprintComponents | null;
}

export interface FingerprintComponents {
  deviceName: string;
  platform: string;
  hardwareConcurrency: number;
  /** IANA timezone e.g. "Asia/Amman"; optional for backward compatibility. */
  timezone?: string;
  /** Browser language e.g. "en-US"; optional for backward compatibility. */
  language?: string;
}
