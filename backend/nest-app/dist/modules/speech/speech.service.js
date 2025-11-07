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
var SpeechService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpeechService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const human_input_schema_1 = require("./schemas/human-input.schema");
let SpeechService = SpeechService_1 = class SpeechService {
    constructor(humanInputModel) {
        this.humanInputModel = humanInputModel;
        this.logger = new common_1.Logger(SpeechService_1.name);
    }
    async create(createDto) {
        try {
            const humanInput = new this.humanInputModel({
                ...createDto,
                userId: new mongoose_2.Types.ObjectId(createDto.userId),
                terminalId: createDto.terminalId ? new mongoose_2.Types.ObjectId(createDto.terminalId) : undefined,
                status: 'pending',
            });
            const saved = await humanInput.save();
            this.logger.log(`Created human input: ${saved._id}`);
            this.processInput(saved._id.toString()).catch(err => {
                this.logger.error(`Failed to process input ${saved._id}: ${err.message}`);
            });
            return saved;
        }
        catch (error) {
            this.logger.error('Failed to create human input:', error);
            throw new common_1.BadRequestException('Failed to create human input');
        }
    }
    async findAll(filters = {}, options = {}) {
        const { userId, terminalId, status, inputType, startDate, endDate } = filters;
        const { limit = 100, skip = 0, sort = { createdAt: -1 } } = options;
        const query = {};
        if (userId)
            query.userId = new mongoose_2.Types.ObjectId(userId);
        if (terminalId)
            query.terminalId = new mongoose_2.Types.ObjectId(terminalId);
        if (status)
            query.status = status;
        if (inputType)
            query.inputType = inputType;
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate)
                query.createdAt.$gte = new Date(startDate);
            if (endDate)
                query.createdAt.$lte = new Date(endDate);
        }
        return this.humanInputModel
            .find(query)
            .populate('userId', 'name email')
            .populate('terminalId', 'name type')
            .sort(sort)
            .limit(limit)
            .skip(skip)
            .exec();
    }
    async findOne(id) {
        if (!mongoose_2.Types.ObjectId.isValid(id)) {
            throw new common_1.BadRequestException('Invalid ID format');
        }
        const humanInput = await this.humanInputModel
            .findById(id)
            .populate('userId', 'name email')
            .populate('terminalId', 'name type')
            .exec();
        if (!humanInput) {
            throw new common_1.NotFoundException(`Human input with ID ${id} not found`);
        }
        return humanInput;
    }
    async findByUser(userId, options = {}) {
        if (!mongoose_2.Types.ObjectId.isValid(userId)) {
            throw new common_1.BadRequestException('Invalid user ID format');
        }
        const { limit = 50, skip = 0 } = options;
        return this.humanInputModel
            .find({ userId: new mongoose_2.Types.ObjectId(userId) })
            .populate('terminalId', 'name type')
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip)
            .exec();
    }
    async findLatest(count = 10) {
        return this.humanInputModel
            .find()
            .populate('userId', 'name email')
            .populate('terminalId', 'name type')
            .sort({ createdAt: -1 })
            .limit(count)
            .exec();
    }
    async update(id, updateDto) {
        if (!mongoose_2.Types.ObjectId.isValid(id)) {
            throw new common_1.BadRequestException('Invalid ID format');
        }
        const updated = await this.humanInputModel
            .findByIdAndUpdate(id, { ...updateDto, updatedAt: new Date() }, { new: true, runValidators: true })
            .populate('userId', 'name email')
            .populate('terminalId', 'name type')
            .exec();
        if (!updated) {
            throw new common_1.NotFoundException(`Human input with ID ${id} not found`);
        }
        this.logger.log(`Updated human input: ${id}`);
        return updated;
    }
    async delete(id) {
        if (!mongoose_2.Types.ObjectId.isValid(id)) {
            throw new common_1.BadRequestException('Invalid ID format');
        }
        const result = await this.humanInputModel.deleteOne({ _id: id }).exec();
        if (result.deletedCount === 0) {
            throw new common_1.NotFoundException(`Human input with ID ${id} not found`);
        }
        this.logger.log(`Deleted human input: ${id}`);
    }
    async getStatistics(userId) {
        const pipeline = [];
        if (userId) {
            pipeline.push({ $match: { userId: new mongoose_2.Types.ObjectId(userId) } });
        }
        pipeline.push({
            $group: {
                _id: null,
                total: { $sum: 1 },
                byStatus: {
                    $push: '$status',
                },
                byType: {
                    $push: '$inputType',
                },
            },
        }, {
            $project: {
                _id: 0,
                total: 1,
                statusCounts: {
                    $arrayToObject: {
                        $map: {
                            input: { $setUnion: ['$byStatus', []] },
                            as: 'status',
                            in: {
                                k: '$$status',
                                v: {
                                    $size: {
                                        $filter: {
                                            input: '$byStatus',
                                            as: 'item',
                                            cond: { $eq: ['$$item', '$$status'] },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                typeCounts: {
                    $arrayToObject: {
                        $map: {
                            input: { $setUnion: ['$byType', []] },
                            as: 'type',
                            in: {
                                k: '$$type',
                                v: {
                                    $size: {
                                        $filter: {
                                            input: '$byType',
                                            as: 'item',
                                            cond: { $eq: ['$$item', '$$type'] },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        const result = await this.humanInputModel.aggregate(pipeline).exec();
        if (result.length === 0) {
            return {
                total: 0,
                statusCounts: {},
                typeCounts: {},
            };
        }
        return result[0];
    }
    async processInput(inputId) {
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this.humanInputModel.findByIdAndUpdate(inputId, {
                status: 'processed',
                processedAt: new Date(),
                processedResponse: 'Input received and processed successfully',
            });
            this.logger.log(`Processed human input: ${inputId}`);
        }
        catch (error) {
            this.logger.error(`Failed to process input ${inputId}:`, error);
            await this.humanInputModel.findByIdAndUpdate(inputId, {
                status: 'failed',
                processedAt: new Date(),
                processedResponse: error.message,
            });
        }
    }
};
exports.SpeechService = SpeechService;
exports.SpeechService = SpeechService = SpeechService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(human_input_schema_1.HumanInput.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], SpeechService);
//# sourceMappingURL=speech.service.js.map