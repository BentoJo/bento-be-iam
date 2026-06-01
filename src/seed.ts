import { createHash } from 'node:crypto';
import db from './shared/configs/db.config';
import {
  users,
  devices,
  sessions,
  otps,
  userSettings,
} from './shared/db/schema';

/* =====================================================================
   DETERMINISTIC IDS
   uuid v5-style id derived from a name. The SAME algorithm + names are
   used in the authz and ws seeds, so cross-service references (userId,
   workspaceId, authzRoleId) line up without any shared files.
===================================================================== */

function detUuid(name: string): string {
  const h = createHash('sha1').update(`bento:${name}`).digest('hex');
  const variant = ((parseInt(h.slice(16, 18), 16) & 0x3f) | 0x80)
    .toString(16)
    .padStart(2, '0');
  return [
    h.slice(0, 8),
    h.slice(8, 12),
    '5' + h.slice(13, 16),
    variant + h.slice(18, 20),
    h.slice(20, 32),
  ].join('-');
}

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

const userId = (i: number) => detUuid(`user:${i}`);

/* =====================================================================
   TOPOLOGY (replicated in authz + ws seeds)
===================================================================== */

const USER_COUNT = 25;

const FIRST_NAMES = [
  'Aya', 'Omar', 'Lina', 'Yousef', 'Sara', 'Khaled', 'Nour', 'Hadi',
  'Maya', 'Sami', 'Rana', 'Tariq', 'Dana', 'Faris', 'Leen', 'Ziad',
  'Hana', 'Bilal', 'Salma', 'Karim', 'Reem', 'Adam', 'Jana', 'Saif', 'Lana',
];
const LAST_NAMES = [
  'Haddad', 'Nasser', 'Khalil', 'Mansour', 'Aziz', 'Saleh', 'Darwish',
  'Hamdan', 'Rashid', 'Younis', 'Suleiman', 'Barakat', 'Faraj', 'Habib',
  'Qasem', 'Issa', 'Murad', 'Sabbagh', 'Zaide', 'Othman', 'Karam', 'Najjar',
  'Asfour', 'Halabi', 'Tannous',
];

const GENDERS = ['male', 'female'];

const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000);

/* =====================================================================
   SEED
===================================================================== */

async function seedIam() {
  console.log('🌱 Seeding IAM...');

  /* ---- users ---- */
  const userRows = Array.from({ length: USER_COUNT }, (_, idx) => {
    const i = idx + 1;
    const first = FIRST_NAMES[idx % FIRST_NAMES.length];
    const last = LAST_NAMES[idx % LAST_NAMES.length];
    return {
      id: userId(i),
      email: `user${i}@bento.test`,
      firstName: first,
      lastName: last,
      avatarUrl: `https://i.pravatar.cc/150?img=${(i % 70) + 1}`,
      bio: `${first} ${last} — Bento workspace member #${i}.`,
      phone: `+96279${String(1000000 + i).slice(-7)}`,
      dob: `199${i % 10}-0${(i % 9) + 1}-1${i % 9}`,
      gender: GENDERS[i % 2],
      authStatus: 'verified' as const,
      globalRole:
        i === 1 ? ('superAdmin' as const) : i <= 3 ? ('admin' as const) : ('user' as const),
      failedAttempts: 0,
    };
  });
  await db.insert(users).values(userRows).onConflictDoNothing();

  /* ---- devices (1-2 per user) ---- */
  const deviceRows = userRows.flatMap((u, idx) => {
    const i = idx + 1;
    const count = (i % 2) + 1; // 1 or 2 devices
    return Array.from({ length: count }, (_, d) => {
      const platform = d === 0 ? 'web' : 'mobile';
      return {
        id: detUuid(`device:${i}:${d + 1}`),
        userId: u.id,
        deviceFingerprintHash: sha256(`fp:${i}:${d + 1}`),
        deviceName: d === 0 ? 'Chrome on macOS' : 'Bento iOS App',
        fingerprintComponents: {
          deviceName: d === 0 ? 'MacBook Pro' : 'iPhone 15',
          platform,
          hardwareConcurrency: d === 0 ? 10 : 6,
          timezone: 'Asia/Amman',
          language: 'en-US',
        },
        lastSeenAt: daysFromNow(-(i % 7)),
      };
    });
  });
  await db.insert(devices).values(deviceRows).onConflictDoNothing();

  /* ---- sessions (1 active per user, on their first device) ---- */
  const sessionRows = userRows.map((u, idx) => {
    const i = idx + 1;
    return {
      id: detUuid(`session:${i}`),
      userId: u.id,
      deviceId: detUuid(`device:${i}:1`),
      refreshTokenHash: sha256(`rt:${i}`),
      lastActivity: daysFromNow(-(i % 3)),
      ipAddress: `185.60.${i % 255}.${(i * 7) % 255}`,
      expiresAt: daysFromNow(30),
    };
  });
  await db.insert(sessions).values(sessionRows).onConflictDoNothing();

  /* ---- otps (one consumed REGISTRATION + one fresh LOGIN per user) ---- */
  const otpRows = userRows.flatMap((u, idx) => {
    const i = idx + 1;
    return [
      {
        id: detUuid(`otp:${i}:reg`),
        userId: u.id,
        type: 'REGISTRATION' as const,
        code: sha256(`otp:reg:${i}`),
        attempts: 1,
        expiresAt: daysFromNow(-10),
        usedAt: daysFromNow(-10),
      },
      {
        id: detUuid(`otp:${i}:login`),
        userId: u.id,
        type: 'LOGIN' as const,
        code: sha256(`otp:login:${i}`),
        attempts: 0,
        expiresAt: daysFromNow(1),
      },
    ];
  });
  await db.insert(otps).values(otpRows).onConflictDoNothing();

  /* ---- user settings (theme + language + notifications) ---- */
  const settingRows = userRows.flatMap((u, idx) => {
    const i = idx + 1;
    return [
      { id: detUuid(`setting:${i}:theme`), userId: u.id, key: 'theme', value: i % 2 ? 'dark' : 'light' },
      { id: detUuid(`setting:${i}:lang`), userId: u.id, key: 'language', value: i % 3 ? 'en' : 'ar' },
      { id: detUuid(`setting:${i}:notif`), userId: u.id, key: 'email_notifications', value: 'true' },
    ];
  });
  await db.insert(userSettings).values(settingRows).onConflictDoNothing();

  console.log(
    `✅ IAM seeded: ${userRows.length} users, ${deviceRows.length} devices, ${sessionRows.length} sessions, ${otpRows.length} otps, ${settingRows.length} settings`,
  );
}

void seedIam()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ IAM seed failed');
    console.error(error);
    process.exit(1);
  });
