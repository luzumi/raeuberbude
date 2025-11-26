import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ObjectId } from 'mongodb';
import { HumanInput, HumanInputDocument } from './schemas/human-input.schema';
import { TestInput, TestInputDocument } from './schemas/test-input.schema';
import { CreateHumanInputDto } from './dto/create-human-input.dto';
import { UpdateHumanInputDto } from './dto/update-human-input.dto';

@Injectable()
export class SpeechService {
  private readonly logger = new Logger(SpeechService.name);

  constructor(
    @InjectModel(HumanInput.name)
    private readonly humanInputModel: Model<HumanInputDocument>,
    @InjectModel(TestInput.name)
    private readonly testInputModel: Model<TestInputDocument>,
  ) {}

  async create(createDto: CreateHumanInputDto): Promise<HumanInput> {
    try {
      const humanInput = new this.humanInputModel({
        ...createDto,
        userId: new ObjectId(createDto.userId),
        terminalId: createDto.terminalId ? new ObjectId(createDto.terminalId) : undefined,
        status: 'pending',
      });

      const saved = await humanInput.save();
      this.logger.log(`Created human input: ${String(saved._id)}`);

      // Process the input asynchronously
      this.processInput(saved._id.toString()).catch(err => {
        this.logger.error(`Failed to process input ${saved._id}: ${err.message}`);
      });

      return saved;
    } catch (error) {
      this.logger.error('Failed to create human input:', error);
      throw new BadRequestException('Failed to create human input');
    }
  }

  async findAll(filters: any = {}, options: any = {}): Promise<HumanInput[]> {
    const { userId, terminalId, status, inputType, startDate, endDate } = filters;
    const { limit = 100, skip = 0, sort = { createdAt: -1 } } = options;

    const query: any = {};

    if (userId) query.userId = new ObjectId(userId);
    if (terminalId) query.terminalId = new ObjectId(terminalId);
    if (status) query.status = status;
    if (inputType) query.inputType = inputType;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
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

  async findOne(id: string): Promise<HumanInput> {
    if (!ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ID format');
    }

    const humanInput = await this.humanInputModel
      .findById(id)
      .populate('userId', 'name email')
      .populate('terminalId', 'name type')
      .exec();

    if (!humanInput) {
      throw new NotFoundException(`Human input with ID ${id} not found`);
    }

    return humanInput;
  }

  async findByUser(userId: string, options: any = {}): Promise<HumanInput[]> {
    if (!ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID format');
    }

    const { limit = 50, skip = 0 } = options;

    return this.humanInputModel
      .find({ userId: new ObjectId(userId) })
      .populate('terminalId', 'name type')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  async findLatest(count: number = 10): Promise<HumanInput[]> {
    return this.humanInputModel
      .find()
      .populate('userId', 'name email')
      .populate('terminalId', 'name type')
      .sort({ createdAt: -1 })
      .limit(count)
      .exec();
  }

  async update(id: string, updateDto: UpdateHumanInputDto): Promise<HumanInput> {
    if (!ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ID format');
    }

    const updated = await this.humanInputModel
      .findByIdAndUpdate(
        id,
        { ...updateDto, updatedAt: new Date() },
        { new: true, runValidators: true }
      )
      .populate('userId', 'name email')
      .populate('terminalId', 'name type')
      .exec();

    if (!updated) {
      throw new NotFoundException(`Human input with ID ${id} not found`);
    }

    this.logger.log(`Updated human input: ${id}`);
    return updated;
  }

  async delete(id: string): Promise<void> {
    if (!ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ID format');
    }

    const result = await this.humanInputModel.deleteOne({ _id: id }).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(`Human input with ID ${id} not found`);
    }

    this.logger.log(`Deleted human input: ${id}`);
  }

  async getStatistics(userId?: string): Promise<any> {
    const pipeline: any[] = [];

    if (userId) {
      pipeline.push({ $match: { userId: new ObjectId(userId) } });
    }

    pipeline.push(
      {
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
      },
      {
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
      },
    );

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

  private async processInput(inputId: string): Promise<void> {
    try {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Here you would integrate with actual speech processing services
      // For now, we just mark it as processed
      await this.humanInputModel.findByIdAndUpdate(
        inputId,
        {
          status: 'processed',
          processedAt: new Date(),
          processedResponse: 'Input received and processed successfully',
        }
      );

      this.logger.log(`Processed human input: ${inputId}`);
    } catch (error) {
      this.logger.error(`Failed to process input ${inputId}:`, error);

      await this.humanInputModel.findByIdAndUpdate(
        inputId,
        {
          status: 'failed',
          processedAt: new Date(),
          processedResponse: error.message,
        }
      );
    }
  }

  // Test Input Methods
  async saveTestInput(data: {
    transcript: string;
    audioData: string;
    mimeType: string;
    metadata?: any;
  }): Promise<TestInput> {
    try {
      const testInput = new this.testInputModel({
        transcript: data.transcript,
        audioData: data.audioData,
        mimeType: data.mimeType,
        metadata: data.metadata || {},
      });

      const saved = await testInput.save();
      this.logger.log(`Saved test input: ${String(saved._id)}`);
      return saved;
    } catch (error) {
      this.logger.error('Failed to save test input:', error);
      throw new BadRequestException('Failed to save test input');
    }
  }

  async getTestInputs(): Promise<TestInput[]> {
    try {
      return await this.testInputModel
        .find()
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      this.logger.error('Failed to get test inputs:', error);
      throw new BadRequestException('Failed to get test inputs');
    }
  }

  async getTestInput(id: string): Promise<TestInput> {
    if (!ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ID format');
    }

    const testInput = await this.testInputModel.findById(id).exec();

    if (!testInput) {
      throw new NotFoundException(`Test input with ID ${id} not found`);
    }

    return testInput;
  }

  async deleteTestInput(id: string): Promise<void> {
    if (!ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ID format');
    }

    const result = await this.testInputModel.deleteOne({ _id: id }).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(`Test input with ID ${id} not found`);
    }

    this.logger.log(`Deleted test input: ${id}`);
  }
}
