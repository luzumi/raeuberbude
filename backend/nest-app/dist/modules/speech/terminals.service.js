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
var TerminalsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TerminalsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const app_terminal_schema_1 = require("./schemas/app-terminal.schema");
let TerminalsService = TerminalsService_1 = class TerminalsService {
    constructor(appTerminalModel) {
        this.appTerminalModel = appTerminalModel;
        this.logger = new common_1.Logger(TerminalsService_1.name);
    }
    async create(createDto) {
        try {
            const existing = await this.appTerminalModel.findOne({
                terminalId: createDto.terminalId,
            });
            if (existing) {
                throw new common_1.ConflictException(`Terminal with ID ${createDto.terminalId} already exists`);
            }
            const terminal = new this.appTerminalModel({
                ...createDto,
                assignedUserId: createDto.assignedUserId ? new mongoose_2.Types.ObjectId(createDto.assignedUserId) : undefined,
                lastActiveAt: new Date(),
            });
            const saved = await terminal.save();
            this.logger.log(`Created terminal: ${saved.terminalId}`);
            return saved;
        }
        catch (error) {
            this.logger.error('Failed to create terminal:', error);
            if (error instanceof common_1.ConflictException)
                throw error;
            throw new common_1.BadRequestException('Failed to create terminal');
        }
    }
    async findAll(filters = {}) {
        const { type, status, location } = filters;
        const query = {};
        if (type)
            query.type = type;
        if (status)
            query.status = status;
        if (location)
            query.location = new RegExp(location, 'i');
        return this.appTerminalModel
            .find(query)
            .populate('assignedUserId', 'name email')
            .sort({ createdAt: -1 })
            .exec();
    }
    async findOne(id) {
        let terminal;
        if (mongoose_2.Types.ObjectId.isValid(id)) {
            terminal = await this.appTerminalModel
                .findById(id)
                .populate('assignedUserId', 'name email')
                .exec();
        }
        if (!terminal) {
            terminal = await this.appTerminalModel
                .findOne({ terminalId: id })
                .populate('assignedUserId', 'name email')
                .exec();
        }
        if (!terminal) {
            throw new common_1.NotFoundException(`Terminal with ID ${id} not found`);
        }
        return terminal;
    }
    async findByTerminalId(terminalId) {
        const terminal = await this.appTerminalModel
            .findOne({ terminalId })
            .populate('assignedUserId', 'name email')
            .exec();
        if (!terminal) {
            throw new common_1.NotFoundException(`Terminal with ID ${terminalId} not found`);
        }
        return terminal;
    }
    async update(id, updateDto) {
        const updateData = { ...updateDto };
        if (updateDto.assignedUserId !== undefined) {
            updateData.assignedUserId = updateDto.assignedUserId
                ? new mongoose_2.Types.ObjectId(updateDto.assignedUserId)
                : null;
        }
        let updated;
        if (mongoose_2.Types.ObjectId.isValid(id)) {
            updated = await this.appTerminalModel
                .findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
                .populate('assignedUserId', 'name email')
                .exec();
        }
        if (!updated) {
            updated = await this.appTerminalModel
                .findOneAndUpdate({ terminalId: id }, updateData, { new: true, runValidators: true })
                .populate('assignedUserId', 'name email')
                .exec();
        }
        if (!updated) {
            throw new common_1.NotFoundException(`Terminal with ID ${id} not found`);
        }
        this.logger.log(`Updated terminal: ${updated.terminalId}`);
        return updated;
    }
    async delete(id) {
        let result;
        if (mongoose_2.Types.ObjectId.isValid(id)) {
            result = await this.appTerminalModel.deleteOne({ _id: id }).exec();
        }
        if (!result || result.deletedCount === 0) {
            result = await this.appTerminalModel.deleteOne({ terminalId: id }).exec();
        }
        if (result.deletedCount === 0) {
            throw new common_1.NotFoundException(`Terminal with ID ${id} not found`);
        }
        this.logger.log(`Deleted terminal: ${id}`);
    }
    async updateActivity(terminalId) {
        const terminal = await this.appTerminalModel
            .findOneAndUpdate({ terminalId }, { lastActiveAt: new Date() }, { new: true })
            .exec();
        if (!terminal) {
            throw new common_1.NotFoundException(`Terminal with ID ${terminalId} not found`);
        }
        return terminal;
    }
    async assignUser(terminalId, userId) {
        const updateData = {
            assignedUserId: userId ? new mongoose_2.Types.ObjectId(userId) : null,
        };
        const terminal = await this.appTerminalModel
            .findOneAndUpdate({ terminalId }, updateData, { new: true })
            .populate('assignedUserId', 'name email')
            .exec();
        if (!terminal) {
            throw new common_1.NotFoundException(`Terminal with ID ${terminalId} not found`);
        }
        this.logger.log(`Assigned user ${userId} to terminal ${terminalId}`);
        return terminal;
    }
    async setStatus(terminalId, status) {
        const terminal = await this.appTerminalModel
            .findOneAndUpdate({ terminalId }, { status }, { new: true })
            .exec();
        if (!terminal) {
            throw new common_1.NotFoundException(`Terminal with ID ${terminalId} not found`);
        }
        this.logger.log(`Set terminal ${terminalId} status to ${status}`);
        return terminal;
    }
    async getStatistics() {
        const stats = await this.appTerminalModel.aggregate([
            {
                $facet: {
                    byType: [
                        {
                            $group: {
                                _id: '$type',
                                count: { $sum: 1 },
                                activeCount: {
                                    $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] },
                                },
                            },
                        },
                        {
                            $project: {
                                type: '$_id',
                                _id: 0,
                                total: '$count',
                                active: '$activeCount',
                            },
                        },
                    ],
                    byStatus: [
                        {
                            $group: {
                                _id: '$status',
                                count: { $sum: 1 },
                            },
                        },
                        {
                            $project: {
                                status: '$_id',
                                _id: 0,
                                count: 1,
                            },
                        },
                    ],
                    totals: [
                        {
                            $group: {
                                _id: null,
                                total: { $sum: 1 },
                                assigned: {
                                    $sum: { $cond: [{ $ne: ['$assignedUserId', null] }, 1, 0] },
                                },
                                withMicrophone: {
                                    $sum: { $cond: ['$capabilities.hasMicrophone', 1, 0] },
                                },
                                supportsSpeech: {
                                    $sum: { $cond: ['$capabilities.supportsSpeechRecognition', 1, 0] },
                                },
                            },
                        },
                        {
                            $project: {
                                _id: 0,
                                total: 1,
                                assigned: 1,
                                unassigned: { $subtract: ['$total', '$assigned'] },
                                withMicrophone: 1,
                                supportsSpeech: 1,
                            },
                        },
                    ],
                },
            },
            {
                $project: {
                    byType: 1,
                    byStatus: 1,
                    totals: { $arrayElemAt: ['$totals', 0] },
                },
            },
        ]).exec();
        return stats[0] || {
            byType: [],
            byStatus: [],
            totals: {
                total: 0,
                assigned: 0,
                unassigned: 0,
                withMicrophone: 0,
                supportsSpeech: 0,
            },
        };
    }
    async getActiveTerminals() {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        return this.appTerminalModel
            .find({
            status: 'active',
            lastActiveAt: { $gte: oneHourAgo },
        })
            .populate('assignedUserId', 'name email')
            .sort({ lastActiveAt: -1 })
            .exec();
    }
    async registerTerminal(terminalData) {
        let terminal = await this.appTerminalModel.findOne({
            terminalId: terminalData.terminalId,
        });
        if (terminal) {
            terminal = await this.appTerminalModel
                .findOneAndUpdate({ terminalId: terminalData.terminalId }, {
                ...terminalData,
                status: 'active',
                lastActiveAt: new Date(),
            }, { new: true })
                .exec();
        }
        else {
            terminal = await this.create({
                ...terminalData,
                status: 'active',
                allowedActions: ['speech.use'],
            });
        }
        return terminal;
    }
};
exports.TerminalsService = TerminalsService;
exports.TerminalsService = TerminalsService = TerminalsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(app_terminal_schema_1.AppTerminal.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], TerminalsService);
//# sourceMappingURL=terminals.service.js.map