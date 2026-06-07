import { parseDurationToMs } from '../func/general';

export const ACCESS_TOKEN_EXPIRY = '1w'; // 1 week

export const MIN_SOFT_MATCHES_FOR_MERGE = 1;

/** Max devices per user. */
export const MAX_DEVICES = 2;

/** Max active sessions per device. */
export const MAX_ACTIVE_SESSIONS = 2;

export const SESSION_LIFETIME_DAYS = 40;

export const REFRESH_TOKEN_EXPIRY = '40d';

/**
 * Token lifetimes in SECONDS, DERIVED from the `*_EXPIRY` strings above so the
 * value we report to the frontend always matches the JWT's actual `expiresIn`.
 * (The strings feed `jsonwebtoken`; the seconds feed the absolute-timestamp the
 * next-auth jwt callback compares against `Date.now()`. If these drift, the
 * client refreshes on the wrong cadence — e.g. every 15m for a 1-week token.)
 */
export const ACCESS_TOKEN_TTL_SECONDS = parseDurationToMs(ACCESS_TOKEN_EXPIRY) / 1000;
export const REFRESH_TOKEN_TTL_SECONDS = parseDurationToMs(REFRESH_TOKEN_EXPIRY) / 1000;

/** Current unix time in seconds. */
export const nowEpochSeconds = (): number => Math.floor(Date.now() / 1000);

/** Absolute access-token expiry as a unix-seconds string (what the FE expects). */
export const accessTokenExpiresAt = (): string =>
  (nowEpochSeconds() + ACCESS_TOKEN_TTL_SECONDS).toString();

/** Absolute refresh-token expiry as a unix-seconds string. */
export const refreshTokenExpiresAt = (): string =>
  (nowEpochSeconds() + REFRESH_TOKEN_TTL_SECONDS).toString();
