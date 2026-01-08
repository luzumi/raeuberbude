import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not, IsNull } from 'typeorm';
import { DeviceEntityBinding } from '../entities';
import { HaEntityEntity } from '../entities/ha-entity.entity';
import { CreateDeviceEntityBindingDto, UpdateDeviceEntityBindingDto } from '../dto/device-entity-binding.dto';

/**
 * Service für Device-Entity-Bindungen
 */
@Injectable()
export class DeviceEntityBindingService {
  constructor(
    @InjectRepository(DeviceEntityBinding)
    private readonly bindingRepo: Repository<DeviceEntityBinding>,
    @InjectRepository(HaEntityEntity)
    private readonly entityRepo: Repository<HaEntityEntity>,
  ) {}

  /**
   * Erstellt eine neue Device-Entity-Bindung
   */
  async create(dto: CreateDeviceEntityBindingDto): Promise<DeviceEntityBinding> {
    // Prüfe ob Binding bereits existiert
    const existing = await this.bindingRepo.findOne({
      where: { haDeviceId: dto.haDeviceId, haEntityId: dto.haEntityId },
    });
    if (existing) {
      throw new BadRequestException('Binding already exists');
    }

    const binding = this.bindingRepo.create(dto);
    return this.bindingRepo.save(binding);
  }

  /**
   * Findet alle Bindings eines Devices
   */
  async findByDevice(haDeviceId: string): Promise<DeviceEntityBinding[]> {
    try {
      return await this.bindingRepo.find({
        where: { haDeviceId },
        relations: ['haEntity'],
        order: { displayOrder: 'ASC', createdAt: 'ASC' },
      });
    } catch (err) {
      // If table doesn't exist yet (migrations not run), return empty list instead of 500
      console.error('findByDevice DB error, returning empty list for now:', err.message || err);
      return [];
    }
  }

  /**
   * Findet alle Bindings eines Entities
   */
  async findByEntity(haEntityId: string): Promise<DeviceEntityBinding[]> {
    try {
      return await this.bindingRepo.find({
        where: { haEntityId },
        relations: ['haDevice'],
      });
    } catch (err) {
      console.error('findByEntity DB error, returning empty list for now:', err.message || err);
      return [];
    }
  }

  /**
   * Findet Bindings nach Kategorie
   */
  async findByCategory(haDeviceId: string, customCategory: string): Promise<DeviceEntityBinding[]> {
    return this.bindingRepo.find({
      where: { haDeviceId, customCategory },
      relations: ['haEntity'],
      order: { displayOrder: 'ASC' },
    });
  }

  /**
   * Aktualisiert eine Bindung
   */
  async update(id: string, dto: UpdateDeviceEntityBindingDto): Promise<DeviceEntityBinding> {
    const binding = await this.bindingRepo.findOne({ where: { id } });
    if (!binding) {
      throw new NotFoundException('Binding not found');
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
   * Bulk-Import: Synchronisiere Auto-Bindings aus HA
   * Liest alle Entities mit device_id aus HA und erstellt 'auto' Bindings
   */
  async syncAutoBindings(): Promise<{ created: number; skipped: number }> {
    const entitiesWithDevice = await this.entityRepo.find({
      where: { deviceId: Not(IsNull()) } as any,
    });

    let created = 0;
    let skipped = 0;

    for (const entity of entitiesWithDevice) {
      const existing = await this.bindingRepo.findOne({
        where: { haDeviceId: entity.deviceId, haEntityId: entity.entityId },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await this.bindingRepo.save(
        this.bindingRepo.create({
          haDeviceId: entity.deviceId,
          haEntityId: entity.entityId,
          bindingType: 'auto',
          isVisible: true,
          displayOrder: 100,
        }),
      );
      created++;
    }

    return { created, skipped };
  }

  /**
   * Suggest Bindings: Schlage Entities für ein Device vor
   * Basierend auf:
   * - Domain-Matching (z.B. alle battery-Sensoren für mobile Devices)
   * - Name-Pattern-Matching (entity_id enthält device-name)
   */
  async suggestEntitiesForDevice(haDeviceId: string): Promise<Partial<CreateDeviceEntityBindingDto>[]> {
    // TODO: Implementiere intelligente Vorschläge
    // 1. Finde Device-Name
    // 2. Suche Entities mit ähnlichem Namen
    // 3. Filtere nach relevanten Domains (battery, network, location, etc.)
    return [];
  }

  /**
   * Entity-Filter-Presets: Vordefinierte Selections pro Device-Typ
   * z.B. "alle Sensoren", "nur Batterien", "nur Controls"
   */
  async applyFilterPreset(
    haDeviceId: string,
    preset: 'all_sensors' | 'battery_only' | 'controls_only' | 'location_only',
  ): Promise<DeviceEntityBinding[]> {
    const domainMap = {
      all_sensors: ['sensor', 'binary_sensor'],
      battery_only: ['sensor'], // + filter by device_class=battery
      controls_only: ['switch', 'button', 'light', 'select', 'number'],
      location_only: ['device_tracker'],
    };

    const domains = domainMap[preset];
    const entities = await this.entityRepo.find({
      where: { deviceId: haDeviceId, domain: In(domains) } as any,
    });

    // Filter battery_only by device_class
    let filteredEntities = entities;
    if (preset === 'battery_only') {
      filteredEntities = entities.filter((e) => e.deviceClass === 'battery');
    }

    const bindings: DeviceEntityBinding[] = [];
    for (const entity of filteredEntities) {
      const existing = await this.bindingRepo.findOne({
        where: { haDeviceId, haEntityId: entity.entityId },
      });

      if (existing) {
        bindings.push(existing);
      } else {
        const binding = await this.bindingRepo.save(
          this.bindingRepo.create({
            haDeviceId,
            haEntityId: entity.entityId,
            bindingType: 'manual',
            customCategory: preset,
            isVisible: true,
          }),
        );
        bindings.push(binding);
      }
    }

    return bindings;
  }

  /**
   * Reset Device Bindings: Löscht manuelle Bindings und optional Re-Sync
   */
  async resetDeviceBindings(
    haDeviceId: string,
    options?: { reSync?: boolean; keepAuto?: boolean },
  ): Promise<{ deleted: number; reSynced: number }> {
    const { reSync = false, keepAuto = true } = options || {};

    // Lösche manuelle/suggested Bindings
    // Use TypeORM In() operator instead of Mongo-style $in to be DB-agnostic
    const whereClause: any = { haDeviceId };
    if (keepAuto) {
      whereClause.bindingType = In(['manual', 'suggested']);
    }

    const result = await this.bindingRepo.delete(whereClause);
    const deleted = result.affected || 0;

    let reSynced = 0;
    if (reSync) {
      const syncResult = await this.syncAutoBindings();
      reSynced = syncResult.created;
    }

    return { deleted, reSynced };
  }
}

