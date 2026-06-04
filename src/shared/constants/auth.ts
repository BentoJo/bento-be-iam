export const ACCESS_TOKEN_EXPIRY = '15m';

export const MIN_SOFT_MATCHES_FOR_MERGE = 1;

/** Max devices per user. */
export const MAX_DEVICES = 2;

/** Max active sessions per device. */
export const MAX_ACTIVE_SESSIONS = 2;

export const SESSION_LIFETIME_DAYS = 40;

export const REFRESH_TOKEN_EXPIRY = '40d';

/**
 * Token lifetimes in SECONDS. The `*_EXPIRY` strings above are kept for the
 * `jsonwebtoken` `expiresIn` option (it understands "15m"/"40d"). The values
 * we hand back to the frontend, however, must be ABSOLUTE unix timestamps —
 * the next-auth jwt callback does `Number(accessTokenExpiresAt) * 1000` and
 * compares against `Date.now()`. Returning a duration string there yields
 * `NaN`, so the client never refreshes.
 */
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = SESSION_LIFETIME_DAYS * 24 * 60 * 60;

/** Current unix time in seconds. */
export const nowEpochSeconds = (): number => Math.floor(Date.now() / 1000);

/** Absolute access-token expiry as a unix-seconds string (what the FE expects). */
export const accessTokenExpiresAt = (): string =>
  (nowEpochSeconds() + ACCESS_TOKEN_TTL_SECONDS).toString();

/** Absolute refresh-token expiry as a unix-seconds string. */
export const refreshTokenExpiresAt = (): string =>
  (nowEpochSeconds() + REFRESH_TOKEN_TTL_SECONDS).toString();
