import { Controller, Get } from '@nestjs/common';
import { createPublicKey } from 'crypto';
import { exportJWK } from 'jose';
import { ensureActiveJwtKey, getVerifyingKeys } from '../../shared/func/keys';

@Controller('.well-known')
export class JwksController {
  @Get('jwks.json')
  async getKeys() {
    await ensureActiveJwtKey();
    const verifyingKeys = await getVerifyingKeys();
    const jwks = await Promise.all(
      verifyingKeys.map(async (key) => {
        const jwk = await exportJWK(createPublicKey(key.publicKey));

        return {
          ...jwk,
          kid: key.kid,
          use: 'sig',
          alg: 'RS256',
        };
      }),
    );

    return {
      keys: jwks,
    };
  }
}
