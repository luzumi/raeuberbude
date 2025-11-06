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
exports.HaDeviceSchema = exports.HaDevice = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let HaDevice = class HaDevice {
};
exports.HaDevice = HaDevice;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true }),
    __metadata("design:type", String)
], HaDevice.prototype, "deviceId", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], HaDevice.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], HaDevice.prototype, "manufacturer", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], HaDevice.prototype, "model", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], HaDevice.prototype, "swVersion", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], HaDevice.prototype, "configurationUrl", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [Object], required: false }),
    __metadata("design:type", Array)
], HaDevice.prototype, "connections", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [Object], required: false }),
    __metadata("design:type", Array)
], HaDevice.prototype, "identifiers", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], HaDevice.prototype, "viaDeviceId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], HaDevice.prototype, "areaId", void 0);
exports.HaDevice = HaDevice = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'ha_devices' })
], HaDevice);
exports.HaDeviceSchema = mongoose_1.SchemaFactory.createForClass(HaDevice);
//# sourceMappingURL=ha-device.schema.js.map