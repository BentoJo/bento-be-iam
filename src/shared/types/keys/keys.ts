export interface KeyInfo {
  kid: string;
  publicKey: string;
  privateKey: string;
  status: 'active' | 'grace' | 'revoked';
  activatedAt: Date;
  rotatedAt: Date | null;
  expiresAt: Date;
}
