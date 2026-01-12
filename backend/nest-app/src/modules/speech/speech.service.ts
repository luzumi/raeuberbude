import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SpeechHumanInput, SpeechTestInput } from '../speech-inputs/entities';
import { CreateHumanInputDto } from './dto/create-human-input.dto';
import { UpdateHumanInputDto } from './dto/update-human-input.dto';

@Injectable()
export class SpeechService {
  private readonly logger = new Logger(SpeechService.name);

  constructor(
    @InjectRepository(SpeechHumanInput)
    private readonly humanInputRepo: Repository<SpeechHumanInput>,
    @InjectRepository(SpeechTestInput)
    private readonly testInputRepo: Repository<SpeechTestInput>,
  ) {}

  async create(createDto: CreateHumanInputDto): Promise<SpeechHumanInput> {
    try {
      const humanInput: SpeechHumanInput = this.humanInputRepo.create({
        userId: createDto.userId,
        terminalId: createDto.terminalId ?? null,
        text: createDto.inputText,
        inputType: createDto.inputType || 'speech',
        confidence: createDto.context?.confidence ?? null,
        language: (createDto.metadata as any)?.language ?? null,
          metadata: {
              ...(createDto.metadata),
              ...(createDto.context && { context: createDto.context }),
          },
        status: 'pending',
      });

      const saved = await this.humanInputRepo.save(humanInput);
      this.logger.log(`Created human input: ${saved.id}`);

      // Process the input asynchronously
      this.processInput(saved.id).catch(err => {
        this.logger.error(`Failed to process input ${saved.id}: ${err.message}`);
      });

      return saved;
    } catch (error) {
      this.logger.error('Failed to create human input:', error);
      throw new BadRequestException('Failed to create human input');
    }
  }

  async findAll(filters: any = {}, options: any = {}): Promise<SpeechHumanInput[]> {
    const { userId, terminalId, status, inputType, startDate, endDate } = filters;
    const { limit = 100, skip = 0, sort = { createdAt: -1 } } = options;

    const queryBuilder = this.humanInputRepo.createQueryBuilder('humanInput');

    if (userId) queryBuilder.andWhere('humanInput.userId = :userId', { userId });
    if (terminalId) queryBuilder.andWhere('humanInput.terminalId = :terminalId', { terminalId });
    if (status) queryBuilder.andWhere('humanInput.status = :status', { status });
    if (inputType) queryBuilder.andWhere('humanInput.inputType = :inputType', { inputType });

    if (startDate) {
      queryBuilder.andWhere('humanInput.createdAt >= :startDate', { startDate: new Date(startDate) });
    }
    if (endDate) {
      queryBuilder.andWhere('humanInput.createdAt <= :endDate', { endDate: new Date(endDate) });
    }

    // Apply sorting
    const sortField = Object.keys(sort)[0] || 'createdAt';
    const sortOrder = sort[sortField] === -1 ? 'DESC' : 'ASC';
    queryBuilder.orderBy(`humanInput.${sortField}`, sortOrder);

    queryBuilder.take(limit).skip(skip);

    return queryBuilder.getMany();
  }

  async findOne(id: string): Promise<SpeechHumanInput> {
    const humanInput = await this.humanInputRepo.findOne({
      where: { id },
      relations: ['user', 'terminal']
    });

    if (!humanInput) {
      throw new NotFoundException(`Human input with ID ${id} not found`);
    }

    return humanInput;
  }

  async findByUser(userId: string, options: any = {}): Promise<SpeechHumanInput[]> {
    const { limit = 50, skip = 0 } = options;

    return this.humanInputRepo.find({
      where: { userId },
      relations: ['terminal'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
    });
  }

  async findLatest(count: number = 10): Promise<SpeechHumanInput[]> {
    return this.humanInputRepo.find({
      relations: ['user', 'terminal'],
      order: { createdAt: 'DESC' },
      take: count,
    });
  }

  async update(id: string, updateDto: UpdateHumanInputDto): Promise<SpeechHumanInput> {
    const humanInput = await this.humanInputRepo.findOne({
      where: { id },
      relations: ['user', 'terminal']
    });

    if (!humanInput) {
      throw new NotFoundException(`Human input with ID ${id} not found`);
    }

    Object.assign(humanInput, updateDto);
    const updated = await this.humanInputRepo.save(humanInput);

    this.logger.log(`Updated human input: ${id}`);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const result = await this.humanInputRepo.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Human input with ID ${id} not found`);
    }

    this.logger.log(`Deleted human input: ${id}`);
  }

  async getStatistics(userId?: string): Promise<any> {
    const where: any = userId ? { userId } : {};
    const allInputs = await this.humanInputRepo.find({ where });

    const statusCounts: any = {};
    const typeCounts: any = {};
    let total = 0;

    for (const input of allInputs) {
      total++;

      // Count by status
      const status = input.status;
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      // Count by type
      const type = input.inputType;
      if (type) {
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      }
    }

    return {
      total,
      statusCounts,
      typeCounts,
    };
  }

  private async processInput(inputId: string): Promise<void> {
    try {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Here you would integrate with actual speech processing services
      // For now, we just mark it as processed
      const input = await this.humanInputRepo.findOne({ where: { id: inputId } });
      if (input) {
        input.status = 'processed';
        input.processedAt = new Date();
        input.processedResponse = 'Input received and processed successfully';
        await this.humanInputRepo.save(input);
      }

      this.logger.log(`Processed human input: ${inputId}`);
    } catch (error: any) {
      this.logger.error(`Failed to process input ${inputId}:`, error);

      const input = await this.humanInputRepo.findOne({ where: { id: inputId } });
      if (input) {
        input.status = 'failed';
        input.processedAt = new Date();
        input.processedResponse = error.message;
        await this.humanInputRepo.save(input);
      }
    }
  }

  // Test Input Methods
  async saveTestInput(data: {
    transcript: string;
    audioData: string;
    mimeType: string;
    metadata?: any;
  }): Promise<SpeechTestInput> {
    try {
      const testInput = this.testInputRepo.create({
        transcript: data.transcript,
        audioData: data.audioData,
        mimeType: data.mimeType,
        metadata: data.metadata || {},
      });

      const saved = await this.testInputRepo.save(testInput);
      this.logger.log(`Saved test input: ${saved.id}`);
      return saved;
    } catch (error) {
      this.logger.error('Failed to save test input:', error);
      throw new BadRequestException('Failed to save test input');
    }
  }

  async getTestInputs(): Promise<SpeechTestInput[]> {
    try {
      return await this.testInputRepo.find({
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      this.logger.error('Failed to get test inputs:', error);
      throw new BadRequestException('Failed to get test inputs');
    }
  }

  async getTestInput(id: string): Promise<SpeechTestInput> {
    const testInput = await this.testInputRepo.findOne({ where: { id } });

    if (!testInput) {
      throw new NotFoundException(`Test input with ID ${id} not found`);
    }

    return testInput;
  }

  async deleteTestInput(id: string): Promise<void> {
    const result = await this.testInputRepo.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Test input with ID ${id} not found`);
    }

    this.logger.log(`Deleted test input: ${id}`);
  }
}
