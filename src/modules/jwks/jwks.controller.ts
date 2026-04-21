import { Controller, Get } from '@nestjs/common';
import { exportJWK } from 'jose';
import { RSA_PUBLIC_KEY, JWT_KID } from '../../shared/configs/keys.config';

@Controller('.well-known')
export class JwksController {
  @Get('jwks.json')
  async getKeys() {
    const jwk = await exportJWK(RSA_PUBLIC_KEY);

    return {
      keys: [
        {
          ...jwk,
          kid: JWT_KID,
          use: 'sig',
          alg: 'RS256',
        },
      ],
    };
  }
}
