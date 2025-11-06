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
exports.HaSnapshotSchema = exports.HaSnapshot = exports.SnapshotStatus = void 0;
const mongoose_1 = require("@nestjs/mongoose");
var SnapshotStatus;
(function (SnapshotStatus) {
    SnapshotStatus["PENDING"] = "pending";
    SnapshotStatus["PROCESSING"] = "processing";
    SnapshotStatus["COMPLETED"] = "completed";
    SnapshotStatus["FAILED"] = "failed";
})(SnapshotStatus || (exports.SnapshotStatus = SnapshotStatus = {}));
let HaSnapshot = class HaSnapshot {
};
exports.HaSnapshot = HaSnapshot;
__decorate([
    (0, mongoose_1.Prop)({ type: Date, required: true }),
    __metadata("design:type", Date)
], HaSnapshot.prototype, "timestamp", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String }),
    __metadata("design:type", String)
], HaSnapshot.prototype, "haVersion", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: Object.values(SnapshotStatus), default: SnapshotStatus.PENDING }),
    __metadata("design:type", String)
], HaSnapshot.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: false }),
    __metadata("design:type", String)
], HaSnapshot.prototype, "errorLog", void 0);
exports.HaSnapshot = HaSnapshot = __decorate([
    (0, mongoose_1.Schema)({ timestamps: { createdAt: 'importDate', updatedAt: false }, collection: 'ha_snapshots' })
], HaSnapshot);
exports.HaSnapshotSchema = mongoose_1.SchemaFactory.createForClass(HaSnapshot);
//# sourceMappingURL=ha-snapshot.schema.js.map