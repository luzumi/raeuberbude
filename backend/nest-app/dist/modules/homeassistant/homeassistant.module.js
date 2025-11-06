"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HomeAssistantModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const ha_import_service_1 = require("./services/ha-import.service");
const ha_import_controller_1 = require("./controllers/ha-import.controller");
const ha_query_service_1 = require("./services/ha-query.service");
const ha_entities_controller_1 = require("./controllers/ha-entities.controller");
const ha_snapshot_schema_1 = require("./schemas/ha-snapshot.schema");
const ha_area_schema_1 = require("./schemas/ha-area.schema");
const ha_device_schema_1 = require("./schemas/ha-device.schema");
const ha_entity_schema_1 = require("./schemas/ha-entity.schema");
const ha_entity_state_schema_1 = require("./schemas/ha-entity-state.schema");
const ha_entity_attribute_schema_1 = require("./schemas/ha-entity-attribute.schema");
const ha_person_schema_1 = require("./schemas/ha-person.schema");
const ha_zone_schema_1 = require("./schemas/ha-zone.schema");
const ha_automation_schema_1 = require("./schemas/ha-automation.schema");
const ha_media_player_schema_1 = require("./schemas/ha-media-player.schema");
const ha_service_schema_1 = require("./schemas/ha-service.schema");
const ha_bootstrap_service_1 = require("./services/ha-bootstrap.service");
let HomeAssistantModule = class HomeAssistantModule {
};
exports.HomeAssistantModule = HomeAssistantModule;
exports.HomeAssistantModule = HomeAssistantModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: ha_snapshot_schema_1.HaSnapshot.name, schema: ha_snapshot_schema_1.HaSnapshotSchema },
                { name: ha_area_schema_1.HaArea.name, schema: ha_area_schema_1.HaAreaSchema },
                { name: ha_device_schema_1.HaDevice.name, schema: ha_device_schema_1.HaDeviceSchema },
                { name: ha_entity_schema_1.HaEntity.name, schema: ha_entity_schema_1.HaEntitySchema },
                { name: ha_entity_state_schema_1.HaEntityState.name, schema: ha_entity_state_schema_1.HaEntityStateSchema },
                { name: ha_entity_attribute_schema_1.HaEntityAttribute.name, schema: ha_entity_attribute_schema_1.HaEntityAttributeSchema },
                { name: ha_person_schema_1.HaPerson.name, schema: ha_person_schema_1.HaPersonSchema },
                { name: ha_zone_schema_1.HaZone.name, schema: ha_zone_schema_1.HaZoneSchema },
                { name: ha_automation_schema_1.HaAutomation.name, schema: ha_automation_schema_1.HaAutomationSchema },
                { name: ha_media_player_schema_1.HaMediaPlayer.name, schema: ha_media_player_schema_1.HaMediaPlayerSchema },
                { name: ha_service_schema_1.HaService.name, schema: ha_service_schema_1.HaServiceSchema },
            ])
        ],
        controllers: [ha_import_controller_1.HaImportController, ha_entities_controller_1.HaEntitiesController],
        providers: [ha_import_service_1.HaImportService, ha_query_service_1.HaQueryService, ha_bootstrap_service_1.HaBootstrapService],
        exports: [ha_import_service_1.HaImportService, ha_query_service_1.HaQueryService]
    })
], HomeAssistantModule);
//# sourceMappingURL=homeassistant.module.js.map