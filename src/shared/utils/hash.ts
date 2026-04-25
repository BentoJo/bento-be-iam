import crypto from 'crypto';

export const hash = async (v: string) =>
  crypto
    .createHmac(
      'sha256',
      process.env.OTP_HASH_SECRET || process.env.KEY_REFRESH_SECRET!,
    )
    .update(v)
    .digest('hex');
