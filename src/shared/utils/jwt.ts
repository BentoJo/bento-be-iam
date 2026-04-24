import jwt from 'jsonwebtoken';
import { createPrivateKey } from 'crypto';
import { ACCESS_TOKEN_EXPIRY } from '../constants/auth';
import { AccessTokenPayload } from '../types/auth/jwt';
import { ensureActiveJwtKey } from '../func/keys';

// Sign access token (RS256)
export async function signAccessToken(
  payload: AccessTokenPayload,
): Promise<string> {
  const activeKey = await ensureActiveJwtKey();
  const privateKey = createPrivateKey(activeKey.privateKey);

  return jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    expiresIn: ACCESS_TOKEN_EXPIRY,
    header: { alg: 'RS256', typ: 'JWT', kid: activeKey.kid },
  });
}
