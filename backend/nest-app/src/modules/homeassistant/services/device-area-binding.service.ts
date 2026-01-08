import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { DeviceAreaBinding } from '../entities';
import { CreateDeviceAreaBindingDto, UpdateDeviceAreaBindingDto } from '../dto/device-area-binding.dto';

/**
 * Service für Device-Area-Bindungen
 */
@Injectable()
export class DeviceAreaBindingService {
  constructor(
    @InjectRepository(DeviceAreaBinding)
    private readonly bindingRepo: Repository<DeviceAreaBinding>,
  ) {}

  /**
   * Erstellt eine neue Device-Area-Bindung
   */
  async create(dto: CreateDeviceAreaBindingDto): Promise<DeviceAreaBinding> {
    // Prüfe ob Binding bereits existiert
    const existing = await this.bindingRepo.findOne({
      where: { haDeviceId: dto.haDeviceId, haAreaId: dto.haAreaId },
    });
    if (existing) {
      throw new BadRequestException('Binding already exists');
    }

    // Wenn isPrimary=true, setze alle anderen Bindings des Devices auf isPrimary=false
    if (dto.isPrimary) {
      await this.bindingRepo.update(
        { haDeviceId: dto.haDeviceId },
        { isPrimary: false },
      );
    }

    const binding = this.bindingRepo.create({
      ...dto,
      validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
      validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
    });
    return this.bindingRepo.save(binding);
  }

  /**
   * Findet alle Bindings eines Devices
   */
  async findByDevice(haDeviceId: string): Promise<DeviceAreaBinding[]> {
    return this.bindingRepo.find({
      where: { haDeviceId },
      relations: ['haArea'],
      order: { isPrimary: 'DESC', createdAt: 'ASC' },
    });
  }

  /**
   * Findet alle Bindings einer Area
   */
  async findByArea(haAreaId: string): Promise<DeviceAreaBinding[]> {
    return this.bindingRepo.find({
      where: { haAreaId },
      relations: ['haDevice'],
      order: { isPrimary: 'DESC', createdAt: 'ASC' },
    });
  }

  /**
   * Findet die primäre Area eines Devices
   */
  async findPrimaryArea(haDeviceId: string): Promise<DeviceAreaBinding | null> {
    return this.bindingRepo.findOne({
      where: { haDeviceId, isPrimary: true },
      relations: ['haArea'],
    });
  }

  /**
   * Findet aktive (nicht abgelaufene) Bindings eines Devices
   */
  async findActiveBindings(haDeviceId: string): Promise<DeviceAreaBinding[]> {
    const now = new Date();
    const bindings = await this.findByDevice(haDeviceId);

    return bindings.filter((binding) => {
      if (!binding.isTemporary) return true;
      if (binding.validFrom && binding.validFrom > now) return false;
      return !(binding.validUntil && binding.validUntil < now);
    });
  }

  /**
   * Aktualisiert eine Bindung
   */
  async update(id: string, dto: UpdateDeviceAreaBindingDto): Promise<DeviceAreaBinding> {
    const binding = await this.bindingRepo.findOne({ where: { id } });
    if (!binding) {
      throw new NotFoundException('Binding not found');
    }

    // Wenn isPrimary=true, setze alle anderen Bindings des Devices auf isPrimary=false
    if (dto.isPrimary) {
      await this.bindingRepo.update(
        { haDeviceId: binding.haDeviceId, id: Not(id) } as any,
        { isPrimary: false },
      );
    }

    Object.assign(binding, {
      ...dto,
      validFrom: dto.validFrom ? new Date(dto.validFrom) : binding.validFrom,
      validUntil: dto.validUntil ? new Date(dto.validUntil) : binding.validUntil,
    });
    return this.bindingRepo.save(binding);
  }

  /**
   * Löscht eine Bindung
   */
  async remove(id: string): Promise<void> {
    const result = await this.bindingRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Binding not found');
    }
  }

  /**
   * Cleanup: Entfernt abgelaufene temporäre Bindings
   */
  async cleanupExpiredBindings(): Promise<number> {
    const now = new Date();
    const expired = await this.bindingRepo
      .createQueryBuilder('binding')
      .where('binding.isTemporary = :temp', { temp: true })
      .andWhere('binding.validUntil < :now', { now })
      .getMany();

    for (const binding of expired) {
      await this.bindingRepo.remove(binding);
    }

    return expired.length;
  }
}

