import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HaImportService } from './services/ha-import.service';
import { HaImportController } from './controllers/ha-import.controller';
import { HaQueryService } from './services/ha-query.service';
import { HaEntitiesController } from './controllers/ha-entities.controller';
import { HaSnapshot, HaSnapshotSchema } from './schemas/ha-snapshot.schema';
import { HaArea, HaAreaSchema } from './schemas/ha-area.schema';
import { HaDevice, HaDeviceSchema } from './schemas/ha-device.schema';
import { HaEntity, HaEntitySchema } from './schemas/ha-entity.schema';
import { HaEntityState, HaEntityStateSchema } from './schemas/ha-entity-state.schema';
import { HaEntityAttribute, HaEntityAttributeSchema } from './schemas/ha-entity-attribute.schema';
import { HaPerson, HaPersonSchema } from './schemas/ha-person.schema';
import { HaZone, HaZoneSchema } from './schemas/ha-zone.schema';
import { HaAutomation, HaAutomationSchema } from './schemas/ha-automation.schema';
import { HaMediaPlayer, HaMediaPlayerSchema } from './schemas/ha-media-player.schema';
import { HaService, HaServiceSchema } from './schemas/ha-service.schema';
import { HaBootstrapService } from './services/ha-bootstrap.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: HaSnapshot.name, schema: HaSnapshotSchema },
      { name: HaArea.name, schema: HaAreaSchema },
      { name: HaDevice.name, schema: HaDeviceSchema },
      { name: HaEntity.name, schema: HaEntitySchema },
      { name: HaEntityState.name, schema: HaEntityStateSchema },
      { name: HaEntityAttribute.name, schema: HaEntityAttributeSchema },
      { name: HaPerson.name, schema: HaPersonSchema },
      { name: HaZone.name, schema: HaZoneSchema },
      { name: HaAutomation.name, schema: HaAutomationSchema },
      { name: HaMediaPlayer.name, schema: HaMediaPlayerSchema },
      { name: HaService.name, schema: HaServiceSchema },
    ])
  ],
  controllers: [HaImportController, HaEntitiesController],
  providers: [HaImportService, HaQueryService, HaBootstrapService],
  exports: [HaImportService, HaQueryService]
})
export class HomeAssistantModule {}
