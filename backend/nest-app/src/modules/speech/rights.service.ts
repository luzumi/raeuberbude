import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserRights, UserRightsDocument, PERMISSIONS, ROLE_PERMISSIONS } from './schemas/user-rights.schema';
import { CreateUserRightsDto } from './dto/create-user-rights.dto';
import { UpdateUserRightsDto } from './dto/update-user-rights.dto';

@Injectable()
export class RightsService {
  private readonly logger = new Logger(RightsService.name);

  constructor(
    @InjectModel(UserRights.name)
    private userRightsModel: Model<UserRightsDocument>,
  ) {}

  async create(createDto: CreateUserRightsDto): Promise<UserRights> {
    try {
      // Check if rights already exist for this user
      const existing = await this.userRightsModel.findOne({
        userId: new Types.ObjectId(createDto.userId),
      });

      if (existing) {
        throw new BadRequestException('User rights already exist. Use update instead.');
      }

      // Get default permissions for role
      const rolePermissions = ROLE_PERMISSIONS[createDto.role] || [];
      const permissions = createDto.permissions || rolePermissions;

      const userRights = new this.userRightsModel({
        ...createDto,
        userId: new Types.ObjectId(createDto.userId),
        permissions,
        allowedTerminals: createDto.allowedTerminals?.map(id => new Types.ObjectId(id)) || [],
      });

      const saved = await userRights.save();
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
    const query: any = {};

    if (role) query.role = role;
    if (status) query.status = status;

    return this.userRightsModel
      .find(query)
      .populate('userId', 'name email')
      .populate('allowedTerminals', 'name type')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByUserId(userId: string): Promise<UserRights> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID format');
    }

    const userRights = await this.userRightsModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .populate('allowedTerminals', 'name type')
      .exec();

    if (!userRights) {
      // Return default guest rights if no rights found
      return this.createDefaultRights(userId);
    }

    // Check if rights have expired
    if (userRights.expiresAt && userRights.expiresAt < new Date()) {
      userRights.status = 'suspended';
      await userRights.save();
    }

    return userRights;
  }

  async update(userId: string, updateDto: UpdateUserRightsDto): Promise<UserRights> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID format');
    }

    const updateData: any = { ...updateDto };
    
    if (updateDto.allowedTerminals) {
      updateData.allowedTerminals = updateDto.allowedTerminals.map(id => new Types.ObjectId(id));
    }

    // If role is changed, update permissions accordingly
    if (updateDto.role && !updateDto.permissions) {
      updateData.permissions = ROLE_PERMISSIONS[updateDto.role] || [];
    }

    const updated = await this.userRightsModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId) },
        updateData,
        { new: true, runValidators: true, upsert: true }
      )
      .populate('userId', 'name email')
      .populate('allowedTerminals', 'name type')
      .exec();

    this.logger.log(`Updated user rights for user: ${userId}`);
    return updated;
  }

  async delete(userId: string): Promise<void> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID format');
    }

    const result = await this.userRightsModel
      .deleteOne({ userId: new Types.ObjectId(userId) })
      .exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(`User rights for user ${userId} not found`);
    }

    this.logger.log(`Deleted user rights for user: ${userId}`);
  }

  async hasPermission(userId: string, permission: string): Promise<boolean> {
    const userRights = await this.findByUserId(userId);

    if (userRights.status !== 'active') {
      return false;
    }

    // Admin has all permissions
    if (userRights.role === 'admin') {
      return true;
    }

    return userRights.permissions.includes(permission);
  }

  async checkPermission(userId: string, permission: string): Promise<void> {
    const hasPermission = await this.hasPermission(userId, permission);
    
    if (!hasPermission) {
      throw new ForbiddenException(`User lacks required permission: ${permission}`);
    }
  }

  async canAccessTerminal(userId: string, terminalId: string): Promise<boolean> {
    const userRights = await this.findByUserId(userId);

    if (userRights.status !== 'active') {
      return false;
    }

    // Admin can access all terminals
    if (userRights.role === 'admin') {
      return true;
    }

    // Check if terminal is in allowed list
    return userRights.allowedTerminals.some(
      terminal => terminal.toString() === terminalId
    );
  }

  async getRoleStatistics(): Promise<any> {
    const stats = await this.userRightsModel.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          activeCount: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          role: '$_id',
          _id: 0,
          total: '$count',
          active: '$activeCount',
          inactive: { $subtract: ['$count', '$activeCount'] },
        },
      },
      {
        $sort: { role: 1 },
      },
    ]).exec();

    return {
      byRole: stats,
      total: stats.reduce((sum, item) => sum + item.total, 0),
      totalActive: stats.reduce((sum, item) => sum + item.active, 0),
    };
  }

  private createDefaultRights(userId: string): UserRights {
    // Return a default guest rights object (not saved to DB)
    const defaultRights = new this.userRightsModel({
      userId: new Types.ObjectId(userId),
      role: 'guest',
      permissions: ROLE_PERMISSIONS.guest,
      status: 'active',
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
    const userRights = await this.findByUserId(userId);
    
    if (!userRights.permissions.includes(permission)) {
      userRights.permissions.push(permission);
      await userRights.save();
    }

    return userRights;
  }

  async revokePermission(userId: string, permission: string): Promise<UserRights> {
    const userRights = await this.findByUserId(userId);
    
    userRights.permissions = userRights.permissions.filter(p => p !== permission);
    await userRights.save();

    return userRights;
  }

  async suspendUser(userId: string, reason?: string): Promise<UserRights> {
    return this.update(userId, {
      status: 'suspended',
      metadata: { suspendedAt: new Date(), reason },
    });
  }

  async activateUser(userId: string): Promise<UserRights> {
    return this.update(userId, {
      status: 'active',
      metadata: { activatedAt: new Date() },
    });
  }
}
