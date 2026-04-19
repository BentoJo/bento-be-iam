import { Injectable } from '@nestjs/common';
import { and, eq, ilike, isNull, isNotNull, sql } from 'drizzle-orm';

import db from '../configs/db.config';
import { users } from '../db/schema';
import {
  CreateUserRequest,
  UpdateUserAuthStatusRequest,
  UpdateUserProfileRequest,
  UpdateUserRoleRequest,
  UserInfo,
} from '../types/users/users';

@Injectable()
export class UserFunction {
  async createUser({
    email,
    firstName,
    lastName,
  }: CreateUserRequest): Promise<UserInfo> {
    try {
      const newUser = await db
        .insert(users)
        .values({
          email,
          firstName,
          lastName,
        })
        .returning();

      if (newUser.length === 0) {
        throw new Error('Failed to create user');
      }

      return newUser[0] as UserInfo;
    } catch (error) {
      throw new Error(
        'Error creating user: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  async findUserById(userId: string): Promise<UserInfo | null> {
    try {
      const userRows = await db
        .select()
        .from(users)
        .where(and(eq(users.id, userId), isNull(users.deletedAt)))
        .limit(1);

      if (userRows.length === 0) {
        return null;
      }

      return userRows[0] as UserInfo;
    } catch (error) {
      throw new Error(
        'Error finding user by ID: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  async findUserByEmail(email: string): Promise<UserInfo | null> {
    try {
      const userRows = await db
        .select()
        .from(users)
        .where(and(eq(users.email, email), isNull(users.deletedAt)))
        .limit(1);

      if (userRows.length === 0) {
        return null;
      }

      return userRows[0] as UserInfo;
    } catch (error) {
      throw new Error(
        'Error finding user by email: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  async findUserByIdIncludingDeleted(userId: string): Promise<UserInfo | null> {
    try {
      const userRows = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (userRows.length === 0) {
        return null;
      }

      return userRows[0] as UserInfo;
    } catch (error) {
      throw new Error(
        'Error finding user by ID (including deleted): ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  async findUserByEmailIncludingDeleted(
    email: string,
  ): Promise<UserInfo | null> {
    try {
      const userRows = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (userRows.length === 0) {
        return null;
      }

      return userRows[0] as UserInfo;
    } catch (error) {
      throw new Error(
        'Error finding user by email (including deleted): ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  async findAllUsers(): Promise<UserInfo[]> {
    try {
      const userRows = await db
        .select()
        .from(users)
        .where(isNull(users.deletedAt));

      return userRows as UserInfo[];
    } catch (error) {
      throw new Error(
        'Error finding all users: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  async findUsersByAuthStatus(
    authStatus: 'notVerified' | 'verified' | 'banned',
  ): Promise<UserInfo[]> {
    try {
      const userRows = await db
        .select()
        .from(users)
        .where(and(eq(users.authStatus, authStatus), isNull(users.deletedAt)));

      return userRows as UserInfo[];
    } catch (error) {
      throw new Error(
        'Error finding users by auth status: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  async findUsersByRole(
    role: 'superAdmin' | 'admin' | 'user',
  ): Promise<UserInfo[]> {
    try {
      const userRows = await db
        .select()
        .from(users)
        .where(and(eq(users.globalRole, role), isNull(users.deletedAt)));

      return userRows as UserInfo[];
    } catch (error) {
      throw new Error(
        'Error finding users by role: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  async searchUsersByName(name: string): Promise<UserInfo[]> {
    try {
      const pattern = `%${name}%`;
      const userRows = await db
        .select()
        .from(users)
        .where(
          and(
            sql`(${users.firstName} ILIKE ${pattern} OR ${users.lastName} ILIKE ${pattern})`,
            isNull(users.deletedAt),
          ),
        );

      return userRows as UserInfo[];
    } catch (error) {
      throw new Error(
        'Error searching users by name: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  async searchUsersByEmail(email: string): Promise<UserInfo[]> {
    try {
      const userRows = await db
        .select()
        .from(users)
        .where(and(ilike(users.email, `%${email}%`), isNull(users.deletedAt)));

      return userRows as UserInfo[];
    } catch (error) {
      throw new Error(
        'Error searching users by email: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  async findLockedUsers(): Promise<UserInfo[]> {
    try {
      const userRows = await db
        .select()
        .from(users)
        .where(and(isNotNull(users.lockedUntil), isNull(users.deletedAt)));

      return userRows as UserInfo[];
    } catch (error) {
      throw new Error(
        'Error finding locked users: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  async findDeletedUsers(): Promise<UserInfo[]> {
    try {
      const userRows = await db
        .select()
        .from(users)
        .where(isNotNull(users.deletedAt));

      return userRows as UserInfo[];
    } catch (error) {
      throw new Error(
        'Error finding deleted users: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  async countAllUsers(): Promise<number> {
    try {
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(isNull(users.deletedAt));

      return Number(result[0].count);
    } catch (error) {
      throw new Error(
        'Error counting users: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  async countUsersByAuthStatus(
    authStatus: 'notVerified' | 'verified' | 'banned',
  ): Promise<number> {
    try {
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(and(eq(users.authStatus, authStatus), isNull(users.deletedAt)));

      return Number(result[0].count);
    } catch (error) {
      throw new Error(
        'Error counting users by auth status: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  async countUsersByRole(
    role: 'superAdmin' | 'admin' | 'user',
  ): Promise<number> {
    try {
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(and(eq(users.globalRole, role), isNull(users.deletedAt)));

      return Number(result[0].count);
    } catch (error) {
      throw new Error(
        'Error counting users by role: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  async updateUserProfile(
    userId: string,
    data: UpdateUserProfileRequest,
  ): Promise<UserInfo> {
    try {
      const updatedUser = await db
        .update(users)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(users.id, userId), isNull(users.deletedAt)))
        .returning();

      if (updatedUser.length === 0) {
        throw new Error('User not found or already deleted');
      }

      return updatedUser[0] as UserInfo;
    } catch (error) {
      throw new Error(
        'Error updating user profile: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  async updateUserEmail(userId: string, email: string): Promise<UserInfo> {
    try {
      const updatedUser = await db
        .update(users)
        .set({ email, updatedAt: new Date() })
        .where(and(eq(users.id, userId), isNull(users.deletedAt)))
        .returning();

      if (updatedUser.length === 0) {
        throw new Error('User not found or already deleted');
      }

      return updatedUser[0] as UserInfo;
    } catch (error) {
      throw new Error(
        'Error updating user email: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  async updateUserAuthStatus(
    userId: string,
    { authStatus }: UpdateUserAuthStatusRequest,
  ): Promise<UserInfo> {
    try {
      const updatedUser = await db
        .update(users)
        .set({ authStatus, updatedAt: new Date() })
        .where(and(eq(users.id, userId), isNull(users.deletedAt)))
        .returning();

      if (updatedUser.length === 0) {
        throw new Error('User not found or already deleted');
      }

      return updatedUser[0] as UserInfo;
    } catch (error) {
      throw new Error(
        'Error updating auth status: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  async updateUserRole(
    userId: string,
    { globalRole }: UpdateUserRoleRequest,
  ): Promise<UserInfo> {
    try {
      const updatedUser = await db
        .update(users)
        .set({ globalRole, updatedAt: new Date() })
        .where(and(eq(users.id, userId), isNull(users.deletedAt)))
        .returning();

      if (updatedUser.length === 0) {
        throw new Error('User not found or already deleted');
      }

      return updatedUser[0] as UserInfo;
    } catch (error) {
      throw new Error(
        'Error updating user role: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  async lockUser(userId: string, lockedUntil: Date): Promise<void> {
    try {
      const result = await db
        .update(users)
        .set({ lockedUntil, updatedAt: new Date() })
        .where(and(eq(users.id, userId), isNull(users.deletedAt)))
        .returning({ id: users.id });

      if (result.length === 0) {
        throw new Error('User not found or already deleted');
      }
    } catch (error) {
      throw new Error(
        'Error locking user: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  async unlockUser(userId: string): Promise<void> {
    try {
      const result = await db
        .update(users)
        .set({ lockedUntil: null, failedAttempts: 0, updatedAt: new Date() })
        .where(and(eq(users.id, userId), isNull(users.deletedAt)))
        .returning({ id: users.id });

      if (result.length === 0) {
        throw new Error('User not found or already deleted');
      }
    } catch (error) {
      throw new Error(
        'Error unlocking user: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  async isUserLocked(userId: string): Promise<boolean> {
    try {
      const userRows = await db
        .select({ lockedUntil: users.lockedUntil })
        .from(users)
        .where(and(eq(users.id, userId), isNull(users.deletedAt)))
        .limit(1);

      if (userRows.length === 0) {
        throw new Error('User not found');
      }

      const { lockedUntil } = userRows[0];
      return lockedUntil !== null && lockedUntil > new Date();
    } catch (error) {
      throw new Error(
        'Error checking if user is locked: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  async incrementFailedAttempts(userId: string): Promise<number> {
    try {
      const result = await db
        .update(users)
        .set({
          failedAttempts: sql`${users.failedAttempts} + 1`,
          updatedAt: new Date(),
        })
        .where(and(eq(users.id, userId), isNull(users.deletedAt)))
        .returning({ failedAttempts: users.failedAttempts });

      if (result.length === 0) {
        throw new Error('User not found or already deleted');
      }

      return result[0].failedAttempts ?? 0;
    } catch (error) {
      throw new Error(
        'Error incrementing failed attempts: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  async resetFailedAttempts(userId: string): Promise<void> {
    try {
      const result = await db
        .update(users)
        .set({ failedAttempts: 0, updatedAt: new Date() })
        .where(and(eq(users.id, userId), isNull(users.deletedAt)))
        .returning({ id: users.id });

      if (result.length === 0) {
        throw new Error('User not found or already deleted');
      }
    } catch (error) {
      throw new Error(
        'Error resetting failed attempts: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  async getFailedAttempts(userId: string): Promise<number> {
    try {
      const result = await db
        .select({ failedAttempts: users.failedAttempts })
        .from(users)
        .where(and(eq(users.id, userId), isNull(users.deletedAt)))
        .limit(1);

      if (result.length === 0) {
        throw new Error('User not found');
      }

      return result[0].failedAttempts ?? 0;
    } catch (error) {
      throw new Error(
        'Error getting failed attempts: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  async softDeleteUser(userId: string): Promise<void> {
    try {
      const result = await db
        .update(users)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(users.id, userId), isNull(users.deletedAt)))
        .returning({ id: users.id });

      if (result.length === 0) {
        throw new Error('User not found or already deleted');
      }
    } catch (error) {
      throw new Error(
        'Error soft-deleting user: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  async restoreUser(userId: string): Promise<UserInfo> {
    try {
      const restoredUser = await db
        .update(users)
        .set({ deletedAt: null, updatedAt: new Date() })
        .where(and(eq(users.id, userId), isNotNull(users.deletedAt)))
        .returning();

      if (restoredUser.length === 0) {
        throw new Error('User not found or not deleted');
      }

      return restoredUser[0] as UserInfo;
    } catch (error) {
      throw new Error(
        'Error restoring user: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  async hardDeleteUser(userId: string): Promise<void> {
    try {
      const result = await db
        .delete(users)
        .where(eq(users.id, userId))
        .returning({ id: users.id });

      if (result.length === 0) {
        throw new Error('User not found');
      }
    } catch (error) {
      throw new Error(
        'Error hard-deleting user: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  async existsByEmail(email: string): Promise<boolean> {
    try {
      const result = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, email), isNull(users.deletedAt)))
        .limit(1);

      return result.length > 0;
    } catch (error) {
      throw new Error(
        'Error checking if user exists by email: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  async existsById(userId: string): Promise<boolean> {
    try {
      const result = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, userId), isNull(users.deletedAt)))
        .limit(1);

      return result.length > 0;
    } catch (error) {
      throw new Error(
        'Error checking if user exists by ID: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }
}
