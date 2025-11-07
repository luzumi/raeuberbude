import { Injectable, Logger, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AppTerminal, AppTerminalDocument } from './schemas/app-terminal.schema';
import { CreateAppTerminalDto } from './dto/create-app-terminal.dto';
import { UpdateAppTerminalDto } from './dto/update-app-terminal.dto';

@Injectable()
export class TerminalsService {
  private readonly logger = new Logger(TerminalsService.name);

  constructor(
    @InjectModel(AppTerminal.name)
    private appTerminalModel: Model<AppTerminalDocument>,
  ) {}

  async create(createDto: CreateAppTerminalDto): Promise<AppTerminal> {
    try {
      // Check if terminal ID already exists
      const existing = await this.appTerminalModel.findOne({
        terminalId: createDto.terminalId,
      });

      if (existing) {
        throw new ConflictException(`Terminal with ID ${createDto.terminalId} already exists`);
      }

      const terminal = new this.appTerminalModel({
        ...createDto,
        assignedUserId: createDto.assignedUserId ? new Types.ObjectId(createDto.assignedUserId) : undefined,
        lastActiveAt: new Date(),
      });

      const saved = await terminal.save();
      this.logger.log(`Created terminal: ${saved.terminalId}`);

      return saved;
    } catch (error) {
      this.logger.error('Failed to create terminal:', error);
      if (error instanceof ConflictException) throw error;
      throw new BadRequestException('Failed to create terminal');
    }
  }

  async findAll(filters: any = {}): Promise<AppTerminal[]> {
    const { type, status, location } = filters;
    const query: any = {};

    if (type) query.type = type;
    if (status) query.status = status;
    if (location) query.location = new RegExp(location, 'i');

    return this.appTerminalModel
      .find(query)
      .populate('assignedUserId', 'name email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<AppTerminal> {
    let terminal: AppTerminal;

    // Try to find by MongoDB _id first
    if (Types.ObjectId.isValid(id)) {
      terminal = await this.appTerminalModel
        .findById(id)
        .populate('assignedUserId', 'name email')
        .exec();
    }

    // If not found, try to find by terminalId
    if (!terminal) {
      terminal = await this.appTerminalModel
        .findOne({ terminalId: id })
        .populate('assignedUserId', 'name email')
        .exec();
    }

    if (!terminal) {
      throw new NotFoundException(`Terminal with ID ${id} not found`);
    }

    return terminal;
  }

  async findByTerminalId(terminalId: string): Promise<AppTerminal> {
    const terminal = await this.appTerminalModel
      .findOne({ terminalId })
      .populate('assignedUserId', 'name email')
      .exec();

    if (!terminal) {
      throw new NotFoundException(`Terminal with ID ${terminalId} not found`);
    }

    return terminal;
  }

  async update(id: string, updateDto: UpdateAppTerminalDto): Promise<AppTerminal> {
    const updateData: any = { ...updateDto };

    if (updateDto.assignedUserId !== undefined) {
      updateData.assignedUserId = updateDto.assignedUserId 
        ? new Types.ObjectId(updateDto.assignedUserId) 
        : null;
    }

    let updated: AppTerminal;

    // Try to update by MongoDB _id first
    if (Types.ObjectId.isValid(id)) {
      updated = await this.appTerminalModel
        .findByIdAndUpdate(
          id,
          updateData,
          { new: true, runValidators: true }
        )
        .populate('assignedUserId', 'name email')
        .exec();
    }

    // If not found, try to update by terminalId
    if (!updated) {
      updated = await this.appTerminalModel
        .findOneAndUpdate(
          { terminalId: id },
          updateData,
          { new: true, runValidators: true }
        )
        .populate('assignedUserId', 'name email')
        .exec();
    }

    if (!updated) {
      throw new NotFoundException(`Terminal with ID ${id} not found`);
    }

    this.logger.log(`Updated terminal: ${updated.terminalId}`);
    return updated;
  }

  async delete(id: string): Promise<void> {
    let result: any;

    // Try to delete by MongoDB _id first
    if (Types.ObjectId.isValid(id)) {
      result = await this.appTerminalModel.deleteOne({ _id: id }).exec();
    }

    // If not deleted, try by terminalId
    if (!result || result.deletedCount === 0) {
      result = await this.appTerminalModel.deleteOne({ terminalId: id }).exec();
    }

    if (result.deletedCount === 0) {
      throw new NotFoundException(`Terminal with ID ${id} not found`);
    }

    this.logger.log(`Deleted terminal: ${id}`);
  }

  async updateActivity(terminalId: string): Promise<AppTerminal> {
    const terminal = await this.appTerminalModel
      .findOneAndUpdate(
        { terminalId },
        { lastActiveAt: new Date() },
        { new: true }
      )
      .exec();

    if (!terminal) {
      throw new NotFoundException(`Terminal with ID ${terminalId} not found`);
    }

    return terminal;
  }

  async assignUser(terminalId: string, userId: string | null): Promise<AppTerminal> {
    const updateData: any = {
      assignedUserId: userId ? new Types.ObjectId(userId) : null,
    };

    const terminal = await this.appTerminalModel
      .findOneAndUpdate(
        { terminalId },
        updateData,
        { new: true }
      )
      .populate('assignedUserId', 'name email')
      .exec();

    if (!terminal) {
      throw new NotFoundException(`Terminal with ID ${terminalId} not found`);
    }

    this.logger.log(`Assigned user ${userId} to terminal ${terminalId}`);
    return terminal;
  }

  async setStatus(terminalId: string, status: 'active' | 'inactive' | 'maintenance'): Promise<AppTerminal> {
    const terminal = await this.appTerminalModel
      .findOneAndUpdate(
        { terminalId },
        { status },
        { new: true }
      )
      .exec();

    if (!terminal) {
      throw new NotFoundException(`Terminal with ID ${terminalId} not found`);
    }

    this.logger.log(`Set terminal ${terminalId} status to ${status}`);
    return terminal;
  }

  async getStatistics(): Promise<any> {
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

  async getActiveTerminals(): Promise<AppTerminal[]> {
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

  async registerTerminal(terminalData: {
    terminalId: string;
    name: string;
    type: string;
    capabilities?: any;
    metadata?: any;
  }): Promise<AppTerminal> {
    // Check if terminal exists
    let terminal = await this.appTerminalModel.findOne({
      terminalId: terminalData.terminalId,
    });

    if (terminal) {
      // Update existing terminal
      terminal = await this.appTerminalModel
        .findOneAndUpdate(
          { terminalId: terminalData.terminalId },
          {
            ...terminalData,
            status: 'active',
            lastActiveAt: new Date(),
          },
          { new: true }
        )
        .exec();
    } else {
      // Create new terminal
      terminal = await this.create({
        ...terminalData,
        status: 'active',
        allowedActions: ['speech.use'],
      });
    }

    return terminal;
  }
}
