import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HaImportController } from './controllers/ha-import.controller';
import { HaEntitiesController, HaAutomationsController, HaPersonsController, HaZonesController, HaMediaPlayersController, HaServicesController } from './controllers/ha-entities.controller';
import { HaBootstrapService } from './services/ha-bootstrap.service';
import { HaLiveSyncService } from './services/ha-live-sync.service';
import { HaLiveSyncController } from './controllers/ha-live-sync.controller';
import { HaMariaDbQueryService } from './services/ha-mariadb-query.service';
import { HaMariaDbController } from './controllers/ha-mariadb.controller';
import { HaImportTypeOrmService } from './services/ha-import-typeorm.service';
// TypeORM Entities
import { HaSnapshot } from './entities/ha-snapshot.entity';
import { HaArea } from './entities/ha-area.entity';
import { HaDevice } from './entities/ha-device.entity';
import { HaEntityEntity } from './entities/ha-entity.entity';
import { HaEntityState } from './entities/ha-entity-state.entity';
import { HaEntityAttribute } from './entities/ha-entity-attribute.entity';
import { HaPerson } from './entities/ha-person.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HaSnapshot,
      HaArea,
      HaDevice,
      HaEntityEntity,
      HaEntityState,
      HaEntityAttribute,
      HaPerson,
    ]),
  ],
  controllers: [
    HaImportController,
    HaEntitiesController,
    HaAutomationsController,
    HaPersonsController,
    HaZonesController,
    HaMediaPlayersController,
    HaServicesController,
    HaLiveSyncController,
    HaMariaDbController
  ],
  providers: [HaImportTypeOrmService, HaBootstrapService, HaLiveSyncService, HaMariaDbQueryService],
  exports: [HaImportTypeOrmService, HaLiveSyncService, HaMariaDbQueryService]
})
export class HomeAssistantModule {}
