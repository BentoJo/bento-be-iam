import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  date,
  pgEnum,
  index,
  unique,
  jsonb,
} from 'drizzle-orm/pg-core';

// --- Enums ---

export const authStatusEnum = pgEnum('auth_status', [
  'notVerified',
  'verified',
  'banned',
]);
export const globalRolesEnum = pgEnum('global_roles', [
  'superAdmin',
  'admin',
  'user',
]);
export const otpTypeEnum = pgEnum('otp_type', ['LOGIN', 'REGISTRATION']);

// --- Tables ---

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    firstName: varchar('first_name', { length: 255 }).notNull(),
    lastName: varchar('last_name', { length: 255 }).notNull(),
    avatarUrl: varchar('avatar_url', { length: 255 }),
    bio: text('bio'),
    phone: varchar('phone', { length: 50 }),
    dob: date('dob'),
    gender: varchar('gender', { length: 50 }),

    authStatus: authStatusEnum('auth_status').default('notVerified'),
    globalRole: globalRolesEnum('global_role').default('user'),

    lockedUntil: timestamp('locked_until'),
    failedAttempts: integer('failed_attempts').default(0),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    emailIdx: index('users_email_idx').on(table.email),
    authStatusIdx: index('users_auth_status_idx').on(table.authStatus),
  }),
);

export const otps = pgTable(
  'otps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    type: otpTypeEnum('type').notNull(),
    code: varchar('code', { length: 255 }).notNull(),
    attempts: integer('attempts').default(0),
    expiresAt: timestamp('expires_at').notNull(),
    usedAt: timestamp('used_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('otps_user_id_idx').on(table.userId),
    typeIdx: index('otps_type_idx').on(table.type),
    expiresAtIdx: index('otps_expires_at_idx').on(table.expiresAt),
  }),
);

export const devices = pgTable(
  'devices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    deviceFingerprintHash: varchar('device_fingerprint_hash', {
      length: 255,
    }).notNull(),
    deviceName: varchar('device_name', { length: 255 }),
    fingerprintComponents: jsonb('fingerprint_components').$type<{
      deviceName: string;
      platform: string;
      hardwareConcurrency: number;
      timezone?: string;
      language?: string;
    }>(),
    firstSeenAt: timestamp('first_seen_at').defaultNow().notNull(),
    lastSeenAt: timestamp('last_seen_at'),
    revokedAt: timestamp('revoked_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('devices_user_id_idx').on(table.userId),
    fingerprintIdx: index('devices_fingerprint_idx').on(
      table.deviceFingerprintHash,
    ),
    userFingerprintUnique: unique('devices_user_fingerprint_unique').on(
      table.userId,
      table.deviceFingerprintHash,
    ),
  }),
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    deviceId: uuid('device_id')
      .notNull()
      .references(() => devices.id),
    refreshTokenHash: varchar('refresh_token_hash', { length: 255 })
      .notNull()
      .unique(),
    lastActivity: timestamp('last_activity').notNull(),
    ipAddress: varchar('ip_address', { length: 45 }),
    revokedAt: timestamp('revoked_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    expiresAt: timestamp('expires_at').notNull(),
  },
  (table) => ({
    userIdIdx: index('sessions_user_id_idx').on(table.userId),
    deviceIdIdx: index('sessions_device_id_idx').on(table.deviceId),
  }),
);

export const userSettings = pgTable(
  'user_settings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    key: varchar('key', { length: 255 }).notNull(),
    value: text('value').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('user_settings_user_id_idx').on(table.userId),
    keyIdx: index('user_settings_key_idx').on(table.key),
    userKeyUnique: unique('user_settings_user_key_unique').on(
      table.userId,
      table.key,
    ),
  }),
);
