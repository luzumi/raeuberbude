import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { UserDeviceBinding } from '../entities';
import { CreateUserDeviceBindingDto, UpdateUserDeviceBindingDto } from '../dto/user-device-binding.dto';

/**
 * Service für User-Device-Bindungen
 */
@Injectable()
export class UserDeviceBindingService {
  constructor(
    @InjectRepository(UserDeviceBinding)
    private readonly bindingRepo: Repository<UserDeviceBinding>,
  ) {}

  /**
   * Erstellt eine neue User-Device-Bindung
   */
  async create(dto: CreateUserDeviceBindingDto): Promise<UserDeviceBinding> {
    // Prüfe ob Binding bereits existiert
    const existing = await this.bindingRepo.findOne({
      where: { userId: dto.userId, haDeviceId: dto.haDeviceId },
    });
    if (existing) {
      throw new BadRequestException('Binding already exists');
    }

    // Wenn isPrimary=true, setze alle anderen Bindings des Users auf isPrimary=false
    if (dto.isPrimary) {
      await this.bindingRepo.update(
        { userId: dto.userId },
        { isPrimary: false },
      );
    }

    const binding = this.bindingRepo.create(dto);
    return this.bindingRepo.save(binding);
  }

  /**
   * Findet alle Bindings eines Users
   */
  async findByUser(userId: string): Promise<UserDeviceBinding[]> {
    return this.bindingRepo.find({
      where: { userId },
      relations: ['haDevice', 'haDevice.haArea'],
      order: { isPrimary: 'DESC', createdAt: 'ASC' },
    });
  }

  /**
   * Findet alle Bindings eines Devices
   */
  async findByDevice(haDeviceId: string): Promise<UserDeviceBinding[]> {
    return this.bindingRepo.find({
      where: { haDeviceId },
      relations: ['user'],
      order: { isPrimary: 'DESC', createdAt: 'ASC' },
    });
  }

  /**
   * Findet das primäre Device eines Users
   */
  async findPrimaryDevice(userId: string): Promise<UserDeviceBinding | null> {
    return this.bindingRepo.findOne({
      where: { userId, isPrimary: true },
      relations: ['haDevice'],
    });
  }

  /**
   * Aktualisiert eine Bindung
   */
  async update(id: string, dto: UpdateUserDeviceBindingDto): Promise<UserDeviceBinding> {
    const binding = await this.bindingRepo.findOne({ where: { id } });
    if (!binding) {
      throw new NotFoundException('Binding not found');
    }

    // Wenn isPrimary=true, setze alle anderen Bindings des Users auf isPrimary=false
    if (dto.isPrimary) {
      await this.bindingRepo.update(
        { userId: binding.userId, id: Not(id) } as any,
        { isPrimary: false },
      );
    }

    Object.assign(binding, dto);
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
   * Bulk-Import: Vorschläge für Bindings basierend auf HA-Daten
   * z.B. Devices die bereits einem User in HA zugeordnet sind (via Person-Entity)
   */
  async suggestBindingsForUser(userId: string): Promise<Partial<CreateUserDeviceBindingDto>[]> {
    // TODO: Implementiere Logik basierend auf HaPerson und device_tracker Entities
    // Beispiel: Finde alle device_tracker Entities die zu einer Person gehören
    return [];
  }
}

