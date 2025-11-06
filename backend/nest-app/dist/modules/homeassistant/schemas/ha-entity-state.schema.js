"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HaEntityStateSchema = exports.HaEntityState = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let HaEntityState = class HaEntityState {
};
exports.HaEntityState = HaEntityState;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], HaEntityState.prototype, "entityId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, required: true, ref: 'HaSnapshot' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], HaEntityState.prototype, "snapshotId", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], HaEntityState.prototype, "state", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], HaEntityState.prototype, "stateClass", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date }),
    __metadata("design:type", Date)
], HaEntityState.prototype, "lastChanged", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date }),
    __metadata("design:type", Date)
], HaEntityState.prototype, "lastUpdated", void 0);
exports.HaEntityState = HaEntityState = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'ha_entity_states' })
], HaEntityState);
exports.HaEntityStateSchema = mongoose_1.SchemaFactory.createForClass(HaEntityState);
//# sourceMappingURL=ha-entity-state.schema.js.map