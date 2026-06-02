import { Injectable } from '@nestjs/common';
import { and, inArray, isNull } from 'drizzle-orm';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';

import db from '../../../shared/configs/db.config';
import { users } from '../../../shared/db/schema';
import { UserFunction } from '../../../shared/func/users';
import {
  UpdateUserProfileRequest,
  UserInfo,
} from '../../../shared/types/users/users';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
  bio: string;
  phone: string;
  dob: string;
  gender: string;
  globalRole: string;
  createdAt: string;
}

@Injectable()
export class UserGrpcService {
  constructor(private readonly userFunction: UserFunction) {}

  private toProfile(user: UserInfo): UserProfile {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl ?? '',
      bio: user.bio ?? '',
      phone: user.phone ?? '',
      dob: user.dob ?? '',
      gender: user.gender ?? '',
      globalRole: user.globalRole ?? '',
      createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : '',
    };
  }

  async getUser(userId: string): Promise<UserProfile> {
    try {
      const user = await this.userFunction.findUserById(userId);

      if (!user) {
        throw new RpcException({
          code: GrpcStatus.NOT_FOUND,
          message: 'User not found',
        });
      }

      return this.toProfile(user);
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: `Failed to get user ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  async updateUser(
    userId: string,
    data: UpdateUserProfileRequest,
  ): Promise<UserProfile> {
    try {
      const updated = await this.userFunction.updateUserProfile(userId, data);
      return this.toProfile(updated);
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: `Failed to update user ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  async getUsersByIds(userIds: string[]): Promise<{ users: UserProfile[] }> {
    try {
      if (!userIds || userIds.length === 0) {
        return { users: [] };
      }

      const userRows = await db
        .select()
        .from(users)
        .where(and(inArray(users.id, userIds), isNull(users.deletedAt)));

      return {
        users: (userRows as UserInfo[]).map((user) => this.toProfile(user)),
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: `Failed to get users by ids ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }
}
