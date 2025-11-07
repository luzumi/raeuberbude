"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var RightsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RightsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const user_rights_schema_1 = require("./schemas/user-rights.schema");
let RightsService = RightsService_1 = class RightsService {
    constructor(userRightsModel) {
        this.userRightsModel = userRightsModel;
        this.logger = new common_1.Logger(RightsService_1.name);
    }
    async create(createDto) {
        try {
            const existing = await this.userRightsModel.findOne({
                userId: new mongoose_2.Types.ObjectId(createDto.userId),
            });
            if (existing) {
                throw new common_1.BadRequestException('User rights already exist. Use update instead.');
            }
            const rolePermissions = user_rights_schema_1.ROLE_PERMISSIONS[createDto.role] || [];
            const permissions = createDto.permissions || rolePermissions;
            const userRights = new this.userRightsModel({
                ...createDto,
                userId: new mongoose_2.Types.ObjectId(createDto.userId),
                permissions,
                allowedTerminals: createDto.allowedTerminals?.map(id => new mongoose_2.Types.ObjectId(id)) || [],
            });
            const saved = await userRights.save();
            this.logger.log(`Created user rights for user: ${createDto.userId}`);
            return saved;
        }
        catch (error) {
            this.logger.error('Failed to create user rights:', error);
            if (error instanceof common_1.BadRequestException)
                throw error;
            throw new common_1.BadRequestException('Failed to create user rights');
        }
    }
    async findAll(filters = {}) {
        const { role, status } = filters;
        const query = {};
        if (role)
            query.role = role;
        if (status)
            query.status = status;
        return this.userRightsModel
            .find(query)
            .populate('userId', 'name email')
            .populate('allowedTerminals', 'name type')
            .sort({ createdAt: -1 })
            .exec();
    }
    async findByUserId(userId) {
        if (!mongoose_2.Types.ObjectId.isValid(userId)) {
            throw new common_1.BadRequestException('Invalid user ID format');
        }
        const userRights = await this.userRightsModel
            .findOne({ userId: new mongoose_2.Types.ObjectId(userId) })
            .populate('allowedTerminals', 'name type')
            .exec();
        if (!userRights) {
            return this.createDefaultRights(userId);
        }
        if (userRights.expiresAt && userRights.expiresAt < new Date()) {
            userRights.status = 'suspended';
            await userRights.save();
        }
        return userRights;
    }
    async update(userId, updateDto) {
        if (!mongoose_2.Types.ObjectId.isValid(userId)) {
            throw new common_1.BadRequestException('Invalid user ID format');
        }
        const updateData = { ...updateDto };
        if (updateDto.allowedTerminals) {
            updateData.allowedTerminals = updateDto.allowedTerminals.map(id => new mongoose_2.Types.ObjectId(id));
        }
        if (updateDto.role && !updateDto.permissions) {
            updateData.permissions = user_rights_schema_1.ROLE_PERMISSIONS[updateDto.role] || [];
        }
        const updated = await this.userRightsModel
            .findOneAndUpdate({ userId: new mongoose_2.Types.ObjectId(userId) }, updateData, { new: true, runValidators: true, upsert: true })
            .populate('userId', 'name email')
            .populate('allowedTerminals', 'name type')
            .exec();
        this.logger.log(`Updated user rights for user: ${userId}`);
        return updated;
    }
    async delete(userId) {
        if (!mongoose_2.Types.ObjectId.isValid(userId)) {
            throw new common_1.BadRequestException('Invalid user ID format');
        }
        const result = await this.userRightsModel
            .deleteOne({ userId: new mongoose_2.Types.ObjectId(userId) })
            .exec();
        if (result.deletedCount === 0) {
            throw new common_1.NotFoundException(`User rights for user ${userId} not found`);
        }
        this.logger.log(`Deleted user rights for user: ${userId}`);
    }
    async hasPermission(userId, permission) {
        const userRights = await this.findByUserId(userId);
        if (userRights.status !== 'active') {
            return false;
        }
        if (userRights.role === 'admin') {
            return true;
        }
        return userRights.permissions.includes(permission);
    }
    async checkPermission(userId, permission) {
        const hasPermission = await this.hasPermission(userId, permission);
        if (!hasPermission) {
            throw new common_1.ForbiddenException(`User lacks required permission: ${permission}`);
        }
    }
    async canAccessTerminal(userId, terminalId) {
        const userRights = await this.findByUserId(userId);
        if (userRights.status !== 'active') {
            return false;
        }
        if (userRights.role === 'admin') {
            return true;
        }
        return userRights.allowedTerminals.some(terminal => terminal.toString() === terminalId);
    }
    async getRoleStatistics() {
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
    createDefaultRights(userId) {
        const defaultRights = new this.userRightsModel({
            userId: new mongoose_2.Types.ObjectId(userId),
            role: 'guest',
            permissions: user_rights_schema_1.ROLE_PERMISSIONS.guest,
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
    async assignRole(userId, role) {
        const validRoles = ['admin', 'manager', 'regular', 'guest', 'terminal'];
        if (!validRoles.includes(role)) {
            throw new common_1.BadRequestException(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
        }
        return this.update(userId, {
            role,
            permissions: user_rights_schema_1.ROLE_PERMISSIONS[role],
        });
    }
    async grantPermission(userId, permission) {
        const userRights = await this.findByUserId(userId);
        if (!userRights.permissions.includes(permission)) {
            userRights.permissions.push(permission);
            await userRights.save();
        }
        return userRights;
    }
    async revokePermission(userId, permission) {
        const userRights = await this.findByUserId(userId);
        userRights.permissions = userRights.permissions.filter(p => p !== permission);
        await userRights.save();
        return userRights;
    }
    async suspendUser(userId, reason) {
        return this.update(userId, {
            status: 'suspended',
            metadata: { suspendedAt: new Date(), reason },
        });
    }
    async activateUser(userId) {
        return this.update(userId, {
            status: 'active',
            metadata: { activatedAt: new Date() },
        });
    }
};
exports.RightsService = RightsService;
exports.RightsService = RightsService = RightsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_rights_schema_1.UserRights.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], RightsService);
//# sourceMappingURL=rights.service.js.map