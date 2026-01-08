import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HaImportController } from './controllers/ha-import.controller';
import { HaEntitiesController, HaAutomationsController, HaPersonsController, HaZonesController, HaMediaPlayersController, HaServicesController } from './controllers/ha-entities.controller';
import { HaBootstrapService } from './services/ha-bootstrap.service';
import { HaLiveSyncService } from './services/ha-live-sync.service';
import { HaLiveSyncController } from './controllers/ha-live-sync.controller';
import { HaMariaDbQueryService } from './services/ha-mariadb-query.service';
import { HaMariaDbController } from './controllers/ha-mariadb.controller';
import { HaImportTypeOrmService } from './services/ha-import-typeorm.service';import { BindingsController } from './controllers/bindings.controller';
import { UserDeviceBindingService } from './services/user-device-binding.service';
import { DeviceEntityBindingService } from './services/device-entity-binding.service';
import { DeviceAreaBindingService } from './services/device-area-binding.service';
// TypeORM Entities
import {
  HaSnapshot,
  HaArea,
  HaDevice,
  HaEntityEntity,
  HaEntityState,
  HaEntityAttribute,
  HaPerson,
  UserDeviceBinding,
  DeviceEntityBinding,
  DeviceAreaBinding,
} from './entities';

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
      UserDeviceBinding,
      DeviceEntityBinding,
      DeviceAreaBinding,
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
    HaMariaDbController,
    BindingsController,
  ],
  providers: [
    HaImportTypeOrmService,
    HaBootstrapService,
    HaLiveSyncService,
    HaMariaDbQueryService,
    UserDeviceBindingService,
    DeviceEntityBindingService,
    DeviceAreaBindingService,
  ],
  exports: [
    HaImportTypeOrmService,
    HaLiveSyncService,
    HaMariaDbQueryService,
    UserDeviceBindingService,
    DeviceEntityBindingService,
    DeviceAreaBindingService,
  ]
})
export class HomeAssistantModule {}
