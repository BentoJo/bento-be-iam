import { createHash } from 'node:crypto';

export function detUuid(name: string): string {
  const h = createHash('sha1').update(`bento:${name}`).digest('hex');
  const variant = ((parseInt(h.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0');
  return [h.slice(0,8), h.slice(8,12), '4'+h.slice(13,16), variant+h.slice(18,20), h.slice(20,32)].join('-');
}

// Real signed-in account — FIXED id (already exists in iam; keep this exact id/email).
const REAL_USER = { key: 'me', id: 'b2fcf3fe-8b7c-44b3-9552-e51ae0ab35dc', email: 'abdulrahman@abukarsh.me', firstName: 'Abdulrahman', lastName: 'Abukarsh' };
const DEMO_USERS = [
  { key: 'omar',   firstName: 'Omar',   lastName: 'Haddad'  },
  { key: 'lina',   firstName: 'Lina',   lastName: 'Khalil'  },
  { key: 'yousef', firstName: 'Yousef', lastName: 'Mansour' },
  { key: 'sara',   firstName: 'Sara',   lastName: 'Nasser'  },
  { key: 'khaled', firstName: 'Khaled', lastName: 'Aziz'    },
  { key: 'nour',   firstName: 'Nour',   lastName: 'Darwish' },
].map(u => ({ ...u, id: detUuid(`user:${u.key}`), email: `${u.key}@bento.test` }));
const USERS = [REAL_USER, ...DEMO_USERS];

/* =====================================================================
   IAM SEED
   Inserts the shared demo USERS so they are cross-service-linked with
   the authz + ws seeds (those derive userId via the SAME detUuid +
   keys above). The REAL_USER already exists — onConflictDoNothing keeps
   the seed idempotent and avoids unique-violation errors.
===================================================================== */

import db from './shared/configs/db.config';
import { users, userSettings } from './shared/db/schema';

const GENDERS = ['male', 'female'];

async function seedIam() {
  console.log('🌱 Seeding IAM...');

  /* ---- users ---- */
  const userRows = USERS.map((u, idx) => ({
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    avatarUrl: u.key === 'me' ? null : `https://i.pravatar.cc/150?u=${u.key}`,
    bio: `${u.firstName} ${u.lastName} — Bento demo member.`,
    phone: `+96279${String(1000000 + idx).slice(-7)}`,
    gender: GENDERS[idx % 2],
    authStatus: 'verified' as const,
    globalRole: 'user' as const,
    failedAttempts: 0,
  }));
  await db.insert(users).values(userRows).onConflictDoNothing();

  /* ---- user settings (email notifications on per user) ---- */
  const settingRows = USERS.map((u) => ({
    id: detUuid(`setting:${u.key}:notif`),
    userId: u.id,
    key: 'email_notifications',
    value: 'true',
  }));
  await db.insert(userSettings).values(settingRows).onConflictDoNothing();

  console.log(
    `✅ IAM seeded: ${userRows.length} users (1 real + ${userRows.length - 1} demo), ${settingRows.length} settings`,
  );
}

void seedIam()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ IAM seed failed');
    console.error(error);
    process.exit(1);
  });
