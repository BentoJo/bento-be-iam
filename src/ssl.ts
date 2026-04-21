import { generateKeyPairSync } from 'crypto';
import { writeFileSync } from 'fs';

// توليد مفاتيح RSA
const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem',
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem',
  },
});

// تحويل لـ base64 (عشان .env)
const privateB64 = Buffer.from(privateKey).toString('base64');
const publicB64 = Buffer.from(publicKey).toString('base64');

// طباعة
console.log('PRIVATE KEY (base64):\n', privateB64);
console.log('\nPUBLIC KEY (base64):\n', publicB64);

// (اختياري) حفظهم في ملفات
writeFileSync('private.pem', privateKey);
writeFileSync('public.pem', publicKey);
