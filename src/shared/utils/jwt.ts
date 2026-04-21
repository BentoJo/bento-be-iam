import jwt from 'jsonwebtoken';
import { RSA_PRIVATE_KEY, JWT_KID } from '../configs/keys.config';
import { ACCESS_TOKEN_EXPIRY } from '../constants/auth';
import { AccessTokenPayload } from '../types/auth/jwt';

// Sign access token (RS256)
export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, RSA_PRIVATE_KEY, {
    algorithm: 'RS256',
    expiresIn: ACCESS_TOKEN_EXPIRY,
    header: { alg: 'RS256', typ: 'JWT', kid: JWT_KID },
  });
}
