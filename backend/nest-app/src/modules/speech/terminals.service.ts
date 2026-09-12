import { Injectable, Logger, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppTerminal } from '../terminals/entities/app-terminal.entity';
import { TerminalType, TerminalStatus } from '../terminals/enums';
import { CreateAppTerminalDto } from './dto/create-app-terminal.dto';
import { UpdateAppTerminalDto } from './dto/update-app-terminal.dto';

@Injectable()
export class TerminalsService {
  private readonly logger = new Logger(TerminalsService.name);

  constructor(
    @InjectRepository(AppTerminal)
    private readonly appTerminalRepo: Repository<AppTerminal>,
  ) {}

  async create(createDto: CreateAppTerminalDto): Promise<AppTerminal> {
    try {
      // Check if terminal ID already exists
      const existing = await this.appTerminalRepo.findOne({
        where: { terminalId: createDto.terminalId },
      });

      if (existing) {
        throw new ConflictException(`Terminal with ID ${createDto.terminalId} already exists`);
      }

      const terminalData: Partial<AppTerminal> = {
        terminalId: createDto.terminalId,
        name: createDto.name,
        description: createDto.description,
        type: createDto.type as any,
        location: createDto.location,
        capabilitiesJson: createDto.capabilities as any,
        status: createDto.status as any,
        assignedUserId: createDto.assignedUserId,
        allowedActionsJson: createDto.allowedActions,
        settingsJson: createDto.settings,
        metadataJson: createDto.metadata,
        lastActiveAt: new Date(),
      };

      const terminal = this.appTerminalRepo.create(terminalData);
      const saved = await this.appTerminalRepo.save(terminal);
      this.logger.log(`Created terminal: ${saved.terminalId}`);

      return saved;
    } catch (error) {
      this.logger.error('Failed to create terminal:', error);
      if (error instanceof ConflictException) throw error;
      throw new BadRequestException('Failed to create terminal');
    }
  }

  async findAll(filters: any = {}): Promise<AppTerminal[]> {
    try {
      const { type, status, location } = filters;

      const queryBuilder = this.appTerminalRepo.createQueryBuilder('terminal');

      // Use entity property names, TypeORM will map to column names
      if (type) queryBuilder.andWhere('terminal.type = :type', { type });
      if (status) queryBuilder.andWhere('terminal.status = :status', { status });
      if (location) queryBuilder.andWhere('terminal.location LIKE :location', { location: `%${location}%` });

      queryBuilder.orderBy('terminal.created_at', 'DESC');

      return await queryBuilder.getMany();
    } catch (error) {
      this.logger.error('Failed to find terminals:', error);
      throw error;
    }
  }

  async findOne(id: string): Promise<AppTerminal> {
    // Try to find by id first
    let terminal = await this.appTerminalRepo.findOne({
      where: { id },
      relations: ['assignedUser'],
    });

    // If not found, try to find by terminalId
    if (!terminal) {
      terminal = await this.appTerminalRepo.findOne({
        where: { terminalId: id },
        relations: ['assignedUser'],
      });
    }

    if (!terminal) {
      throw new NotFoundException(`Terminal with ID ${id} not found`);
    }

    return terminal;
  }

  async findByTerminalId(terminalId: string): Promise<AppTerminal> {
    const terminal = await this.appTerminalRepo.findOne({
      where: { terminalId },
      relations: ['assignedUser'],
    });

    if (!terminal) {
      throw new NotFoundException(`Terminal with ID '${terminalId}' not found`);
    }

    return terminal;
  }

  async update(id: string, updateDto: UpdateAppTerminalDto): Promise<AppTerminal> {
    // Try to find by id first
    let terminal = await this.appTerminalRepo.findOne({ where: { id } });

    // If not found, try by terminalId
    if (!terminal) {
      terminal = await this.appTerminalRepo.findOne({ where: { terminalId: id } });
    }

    if (!terminal) {
      throw new NotFoundException(`Terminal with ID ${id} not found`);
    }

    Object.assign(terminal, updateDto);
    const updated = await this.appTerminalRepo.save(terminal);

    this.logger.log(`Updated terminal: ${updated.terminalId}`);
    return updated;
  }

  async delete(id: string): Promise<void> {
    // Try to delete by id first
    let result = await this.appTerminalRepo.delete({ id });

    // If not deleted, try by terminalId
    if (result.affected === 0) {
      result = await this.appTerminalRepo.delete({ terminalId: id });
    }

    if (result.affected === 0) {
      throw new NotFoundException(`Terminal with ID ${id} not found`);
    }

    this.logger.log(`Deleted terminal: ${id}`);
  }

  async updateActivity(terminalId: string): Promise<AppTerminal> {
    const terminal = await this.appTerminalRepo.findOne({ where: { terminalId } });

    if (!terminal) {
      throw new NotFoundException(`Terminal with ID ${terminalId} not found`);
    }

    terminal.lastActiveAt = new Date();
    return this.appTerminalRepo.save(terminal);
  }

  async assignUser(terminalId: string, userId: string | null): Promise<AppTerminal> {
    const terminal = await this.appTerminalRepo.findOne({
      where: { terminalId },
      relations: ['assignedUser'],
    });

    if (!terminal) {
      throw new NotFoundException(`Terminal with ID ${terminalId} not found`);
    }

    terminal.assignedUserId = userId;
    const updated = await this.appTerminalRepo.save(terminal);

    this.logger.log(`Assigned user ${userId} to terminal ${terminalId}`);
    return updated;
  }

  async setStatus(terminalId: string, status: 'active' | 'inactive' | 'maintenance'): Promise<AppTerminal> {
    const terminal = await this.appTerminalRepo.findOne({ where: { terminalId } });

    if (!terminal) {
      throw new NotFoundException(`Terminal with ID ${terminalId} not found`);
    }

    // Map string to enum
    const statusMap: any = {
      'active': 'ACTIVE',
      'inactive': 'INACTIVE',
      'maintenance': 'MAINTENANCE',
    };
    terminal.status = statusMap[status];
    const updated = await this.appTerminalRepo.save(terminal);

    this.logger.log(`Set terminal ${terminalId} status to ${status}`);
    return updated;
  }

  async getStatistics(): Promise<any> {
    const allTerminals = await this.appTerminalRepo.find();

    const byType: any = {};
    const byStatus: any = {};
    let total = 0;
    let assigned = 0;
    let withMicrophone = 0;
    let supportsSpeech = 0;

    for (const terminal of allTerminals) {
      total++;

      // By type
      const type = terminal.type;
      if (!byType[type]) {
        byType[type] = { type, total: 0, active: 0 };
      }
      byType[type].total++;
      if (terminal.status === 'active') {
        byType[type].active++;
      }

      // By status
      const status = terminal.status;
      if (!byStatus[status]) {
        byStatus[status] = { status, count: 0 };
      }
      byStatus[status].count++;

      // Totals
      if (terminal.assignedUserId) assigned++;
      if (terminal.capabilitiesJson?.microphone) withMicrophone++;
      if (terminal.capabilitiesJson?.wakeWord) supportsSpeech++;
    }

    return {
      byType: Object.values(byType),
      byStatus: Object.values(byStatus),
      totals: {
        total,
        assigned,
        unassigned: total - assigned,
        withMicrophone,
        supportsSpeech,
      },
    };
  }

  async getActiveTerminals(): Promise<AppTerminal[]> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    return this.appTerminalRepo
      .createQueryBuilder('terminal')
      .where('terminal.status = :status', { status: 'active' })
      .andWhere('terminal.lastActiveAt >= :oneHourAgo', { oneHourAgo })
      .leftJoinAndSelect('terminal.assignedUser', 'user')
      .orderBy('terminal.lastActiveAt', 'DESC')
      .getMany();
  }

  async registerTerminal(terminalData: {
    terminalId: string;
    name: string;
    type: string;
    capabilities?: any;
    metadata?: any;
  }): Promise<AppTerminal> {
    // Check if terminal exists
    let terminal = await this.appTerminalRepo.findOne({
      where: { terminalId: terminalData.terminalId },
    });

    if (terminal) {
      // Update existing terminal
      Object.assign(terminal, {
        ...terminalData,
        status: 'active',
        lastActiveAt: new Date(),
      });
      return this.appTerminalRepo.save(terminal);
    } else {
      // Create new terminal
      return this.create({
        ...terminalData,
        status: 'active',
        allowedActions: ['speech.use'],
      });
    }
  }
}
