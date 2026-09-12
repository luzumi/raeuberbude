import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {UserRights, UserRole, UserStatus} from '../auth/entities/user-rights.entity';
import { CreateUserRightsDto } from './dto/create-user-rights.dto';
import { UpdateUserRightsDto } from './dto/update-user-rights.dto';

// Role permissions mapping
const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['all'],
  user: ['read', 'write'],
  guest: ['read'],
};

@Injectable()
export class RightsService {
  private readonly logger = new Logger(RightsService.name);

  constructor(
    @InjectRepository(UserRights)
    private readonly userRightsRepo: Repository<UserRights>,
  ) {}

  async create(createDto: CreateUserRightsDto): Promise<UserRights> {
    try {
      // Check if rights already exist for this user
      const existing = await this.userRightsRepo.findOne({
        where: { userId: createDto.userId },
      });

      if (existing) {
        throw new BadRequestException('User rights already exist. Use update instead.');
      }

      // Get default permissions for role
      const rolePermissions = ROLE_PERMISSIONS[createDto.role] || [];
      const permissions = createDto.permissions || rolePermissions;

      const userRights = this.userRightsRepo.create({
        userId: createDto.userId,
        role: createDto.role as any as UserRole,
        status: (createDto.status as any as UserStatus) || UserStatus.ACTIVE,
        permissionsJson: permissions,
        expiresAt: createDto.expiresAt || null,
        canUseSpeechInput: createDto.canUseSpeechInput ?? true,
        canViewOwnInputs: createDto.canViewOwnInputs ?? true,
        canManageTerminals: createDto.canManageTerminals ?? false,
        canManageUsers: createDto.canManageUsers ?? false,
        canViewAllInputs: createDto.canViewAllInputs ?? false,
        canDeleteInputs: createDto.canDeleteInputs ?? false,
        metadata: createDto.metadata || null,
      });

      const saved = await this.userRightsRepo.save(userRights);
      this.logger.log(`Created user rights for user: ${createDto.userId}`);

      return saved;
    } catch (error) {
      this.logger.error('Failed to create user rights:', error);
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to create user rights');
    }
  }

  async findAll(filters: any = {}): Promise<UserRights[]> {
    const { role, status } = filters;
    const where: any = {};

    if (role) where.role = role;
    if (status) where.status = status;

    return this.userRightsRepo.find({
      where,
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByUserId(userId: string): Promise<UserRights> {
    const userRights = await this.userRightsRepo.findOne({
      where: { userId },
    });

    if (!userRights) {
      // Return default guest rights if no rights found
      return this.createDefaultRights(userId);
    }

    // Check if rights have expired
    if (userRights.expiresAt && userRights.expiresAt < new Date()) {
      userRights.status = UserStatus.SUSPENDED;
      await this.userRightsRepo.save(userRights);
    }

    return userRights;
  }

  async update(userId: string, updateDto: UpdateUserRightsDto): Promise<UserRights> {
    let userRights = await this.userRightsRepo.findOne({ where: { userId } });

    if (!userRights) {
      // Create with upsert behavior
      userRights = this.userRightsRepo.create({
        userId,
        role: (updateDto.role as any as UserRole) || UserRole.REGULAR,
        status: (updateDto.status as any as UserStatus) || UserStatus.ACTIVE,
        permissionsJson: updateDto.permissions || [],
        expiresAt: updateDto.expiresAt || null,
        canUseSpeechInput: updateDto.canUseSpeechInput ?? true,
        canViewOwnInputs: updateDto.canViewOwnInputs ?? true,
        canManageTerminals: updateDto.canManageTerminals ?? false,
        canManageUsers: updateDto.canManageUsers ?? false,
        canViewAllInputs: updateDto.canViewAllInputs ?? false,
        canDeleteInputs: updateDto.canDeleteInputs ?? false,
        metadata: updateDto.metadata || null,
      });
    } else {
      Object.assign(userRights, updateDto);
      if (updateDto.permissions) {
        userRights.permissionsJson = updateDto.permissions;
      }
    }

    // If role is changed, update permissions accordingly
    if (updateDto.role && !updateDto.permissions) {
      const rolePermissions = ROLE_PERMISSIONS[updateDto.role] || [];
      userRights.permissionsJson = rolePermissions;
    }

    const updated = await this.userRightsRepo.save(userRights);
    this.logger.log(`Updated user rights for user: ${userId}`);
    return updated;
  }

  async delete(userId: string): Promise<void> {
    const result = await this.userRightsRepo.delete({ userId });

    if (result.affected === 0) {
      throw new NotFoundException(`User rights for user ${userId} not found`);
    }

    this.logger.log(`Deleted user rights for user: ${userId}`);
  }

  async hasPermission(userId: string, permission: string): Promise<boolean> {
    const userRights = await this.findByUserId(userId);

    if (userRights.status !== UserStatus.ACTIVE) {
      return false;
    }

    // Admin has all permissions
    if (userRights.role === 'admin') {
      return true;
    }

    const permissions = userRights.permissionsJson || [];
    return permissions.includes(permission);
  }

  async checkPermission(userId: string, permission: string): Promise<void> {
    const hasPermission = await this.hasPermission(userId, permission);

    if (!hasPermission) {
      throw new ForbiddenException(`User lacks required permission: ${permission}`);
    }
  }

  async canAccessTerminal(userId: string, terminalId: string): Promise<boolean> {
    const userRights = await this.findByUserId(userId);

    if (userRights.status !== UserStatus.ACTIVE) {
      return false;
    }

    // Admin can access all terminals
    if (userRights.role === 'admin') {
      return true;
    }

    // TODO: Implement allowedTerminals relation
    return false;
  }

  async getRoleStatistics(): Promise<any> {
    const allRights = await this.userRightsRepo.find();

    const byRole: any = {};
    let total = 0;
    let totalActive = 0;

    for (const right of allRights) {
      const role = right.role;
      if (!byRole[role]) {
        byRole[role] = { role, total: 0, active: 0, inactive: 0 };
      }
      byRole[role].total++;
      total++;

      if (right.status === UserStatus.ACTIVE) {
        byRole[role].active++;
        totalActive++;
      } else {
        byRole[role].inactive++;
      }
    }

    return {
      byRole: Object.values(byRole),
      total,
      totalActive,
    };
  }

  private createDefaultRights(userId: string): UserRights {
    // Return a default guest rights object (not saved to DB)
    const defaultRights = this.userRightsRepo.create({
      userId,
      role: UserRole.GUEST,
      permissionsJson: ROLE_PERMISSIONS.guest || [],
      status: UserStatus.ACTIVE,
      canUseSpeechInput: true,
      canViewOwnInputs: true,
      canManageTerminals: false,
      canManageUsers: false,
      canViewAllInputs: false,
      canDeleteInputs: false,
    });

    return defaultRights;
  }

  async assignRole(userId: string, role: string): Promise<UserRights> {
    const validRoles = ['admin', 'manager', 'regular', 'guest', 'terminal'];

    if (!validRoles.includes(role)) {
      throw new BadRequestException(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }

    return this.update(userId, {
      role,
      permissions: ROLE_PERMISSIONS[role],
    });
  }

  async grantPermission(userId: string, permission: string): Promise<UserRights> {
    const userRights = await this.userRightsRepo.findOne({ where: { userId } });

    if (!userRights) {
      throw new NotFoundException(`User rights for user ${userId} not found`);
    }

    const permissions = userRights.permissionsJson || [];
    if (!permissions.includes(permission)) {
      permissions.push(permission);
      userRights.permissionsJson = permissions;
      await this.userRightsRepo.save(userRights);
    }

    return userRights;
  }

  async revokePermission(userId: string, permission: string): Promise<UserRights> {
    const userRights = await this.userRightsRepo.findOne({ where: { userId } });

    if (!userRights) {
      throw new NotFoundException(`User rights for user ${userId} not found`);
    }

    const permissions = userRights.permissionsJson || [];
    const filtered = permissions.filter((p: string) => p !== permission);
    userRights.permissionsJson = filtered;
    await this.userRightsRepo.save(userRights);

    return userRights;
  }

  async suspendUser(userId: string, reason?: string): Promise<UserRights> {
    return this.update(userId, {
      status: UserStatus.SUSPENDED as any,
      metadata: { suspendedAt: new Date(), reason },
    });
  }

  async activateUser(userId: string): Promise<UserRights> {
    return this.update(userId, {
      status: UserStatus.ACTIVE,
      metadata: { activatedAt: new Date() },
    });
  }
}

