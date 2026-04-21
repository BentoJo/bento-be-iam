import { createPrivateKey, createPublicKey, KeyObject } from 'crypto';

// Key Identifier (static for now — rotation in Phase 2)
export const JWT_KID = 'key-1';

// Decode base64-encoded PEM from env
const privateKeyB64 = process.env.JWT_RSA_PRIVATE_KEY;
const publicKeyB64 = process.env.JWT_RSA_PUBLIC_KEY;

if (!privateKeyB64 || !publicKeyB64) {
  throw new Error(
    'Missing JWT_RSA_PRIVATE_KEY or JWT_RSA_PUBLIC_KEY env vars. ' +
      'Generate with: openssl genrsa 2048 | base64 -w0',
  );
}

const privatePem = Buffer.from(privateKeyB64, 'base64').toString('utf8');
const publicPem = Buffer.from(publicKeyB64, 'base64').toString('utf8');

// Detect key type — PKCS#1 ("RSA PRIVATE KEY") vs PKCS#8 ("PRIVATE KEY")
const privateKeyType = privatePem.includes('BEGIN RSA PRIVATE KEY')
  ? 'pkcs1'
  : 'pkcs8';

export const RSA_PRIVATE_KEY: KeyObject = createPrivateKey({
  key: privatePem,
  format: 'pem',
  type: privateKeyType,
});
export const RSA_PUBLIC_KEY: KeyObject = createPublicKey(publicPem);
