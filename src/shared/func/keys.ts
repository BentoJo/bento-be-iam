import db from '../configs/db.config';
import { keys } from '../db/schema';
import { and, desc, eq, inArray, lt } from 'drizzle-orm';
import { generateKeyPairSync, randomUUID } from 'crypto';
import { ACCESS_TOKEN_EXPIRY } from '../constants/auth';
import { KeyInfo } from '../types/keys/keys';
import { parseDurationToMs } from './general';

const JWT_ALGORITHM = 'RS256';
const DEFAULT_KEY_LIFETIME_DAYS = 365;
let activeJwtKeyPromise: Promise<KeyInfo> | null = null;

const ACCESS_TOKEN_TTL_MS = parseDurationToMs(ACCESS_TOKEN_EXPIRY);

function createKeyPair() {
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

  return { publicKey, privateKey };
}

async function createActiveKey(): Promise<KeyInfo> {
  const keyPair = createKeyPair();
  const now = new Date();

  const keyId = `${Date.now()}-${randomUUID()}`;

  const [createdKey] = await db
    .insert(keys)
    .values({
      kid: keyId,
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      status: 'active',
      activatedAt: new Date(),
      rotatedAt: null,
      expiresAt: new Date(
        now.getTime() + DEFAULT_KEY_LIFETIME_DAYS * 24 * 60 * 60 * 1000,
      ),
      algorithm: JWT_ALGORITHM,
    })
    .returning();

  return createdKey;
}

export async function ensureActiveJwtKey(): Promise<KeyInfo> {
  if (!activeJwtKeyPromise) {
    activeJwtKeyPromise = (async () => {
      const activeKeys = await db
        .select()
        .from(keys)
        .where(eq(keys.status, 'active'))
        .orderBy(desc(keys.createdAt));

      if (activeKeys.length === 1) {
        return activeKeys[0];
      }

      if (activeKeys.length > 1) {
        throw new Error(
          `Expected exactly one active JWT key, found ${activeKeys.length}`,
        );
      }

      return createActiveKey();
    })().finally(() => {
      activeJwtKeyPromise = null;
    });
  }

  return activeJwtKeyPromise;
}

export async function getVerifyingJwtKeys(): Promise<KeyInfo[]> {
  return db
    .select()
    .from(keys)
    .where(inArray(keys.status, ['active', 'grace']))
    .orderBy(desc(keys.createdAt));
}

export async function rotateActiveJwtKey(): Promise<KeyInfo> {
  const activeKeys = await db
    .select()
    .from(keys)
    .where(eq(keys.status, 'active'))
    .orderBy(desc(keys.createdAt));

  if (activeKeys.length === 0) {
    return ensureActiveJwtKey();
  }

  if (activeKeys.length > 1) {
    throw new Error(
      `Expected exactly one active JWT key, found ${activeKeys.length}`,
    );
  }

  await deactivateKey(activeKeys[0]);
  return createActiveKey();
}

export async function revokeExpiredGraceKeys(): Promise<number> {
  const expiredKeys = await getExpiredKeys();

  if (expiredKeys.length === 0) {
    return 0;
  }

  await db
    .update(keys)
    .set({ status: 'revoked' })
    .where(
      inArray(
        keys.kid,
        expiredKeys.map((key) => key.kid),
      ),
    );

  return expiredKeys.length;
}
export async function insertKey(keyInfo: KeyInfo): Promise<KeyInfo[]> {
  try {
    const newKey = await db.insert(keys).values(keyInfo).returning();
    return newKey;
  } catch (error) {
    throw new Error(
      'Error inserting key: ' +
        (error instanceof Error ? error.message : String(error)),
    );
  }
}

export async function getActiveKey(): Promise<KeyInfo> {
  try {
    return await ensureActiveJwtKey();
  } catch (error) {
    throw new Error(
      'Error fetching active key: ' +
        (error instanceof Error ? error.message : String(error)),
    );
  }
}

export async function getVerifyingKeys(): Promise<KeyInfo[]> {
  try {
    return await getVerifyingJwtKeys();
  } catch (error) {
    throw new Error(
      'Error fetching all keys: ' +
        (error instanceof Error ? error.message : String(error)),
    );
  }
}

export async function getExpiredKeys(): Promise<KeyInfo[]> {
  try {
    const expiredKeys = await db
      .select()
      .from(keys)
      .where(and(eq(keys.status, 'grace'), lt(keys.expiresAt, new Date())));

    return expiredKeys;
  } catch (error) {
    throw new Error(
      'Error fetching expired keys: ' +
        (error instanceof Error ? error.message : String(error)),
    );
  }
}

export async function deactivateKey(keyInfo: KeyInfo): Promise<void> {
  try {
    await db
      .update(keys)
      .set({
        status: 'grace',
        rotatedAt: new Date(),
        expiresAt: new Date(Date.now() + ACCESS_TOKEN_TTL_MS + 5 * 60 * 1000),
      })
      .where(eq(keys.kid, keyInfo.kid));
  } catch (error) {
    throw new Error(
      'Error deactivating key: ' +
        (error instanceof Error ? error.message : String(error)),
    );
  }
}

export async function revokeKey(keyInfo: KeyInfo): Promise<void> {
  try {
    await db.delete(keys).where(eq(keys.kid, keyInfo.kid));
  } catch (error) {
    throw new Error(
      'Error revoking key: ' +
        (error instanceof Error ? error.message : String(error)),
    );
  }
}
