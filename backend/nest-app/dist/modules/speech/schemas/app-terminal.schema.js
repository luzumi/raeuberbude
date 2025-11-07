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
exports.AppTerminalSchema = exports.AppTerminal = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let AppTerminal = class AppTerminal {
};
exports.AppTerminal = AppTerminal;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true }),
    __metadata("design:type", String)
], AppTerminal.prototype, "terminalId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], AppTerminal.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], AppTerminal.prototype, "description", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['browser', 'mobile', 'tablet', 'kiosk', 'smart-tv', 'other'], default: 'browser' }),
    __metadata("design:type", String)
], AppTerminal.prototype, "type", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], AppTerminal.prototype, "location", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], AppTerminal.prototype, "capabilities", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['active', 'inactive', 'maintenance'], default: 'active' }),
    __metadata("design:type", String)
], AppTerminal.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date }),
    __metadata("design:type", Date)
], AppTerminal.prototype, "lastActiveAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], AppTerminal.prototype, "assignedUserId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], AppTerminal.prototype, "allowedActions", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], AppTerminal.prototype, "settings", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], AppTerminal.prototype, "metadata", void 0);
exports.AppTerminal = AppTerminal = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], AppTerminal);
exports.AppTerminalSchema = mongoose_1.SchemaFactory.createForClass(AppTerminal);
exports.AppTerminalSchema.index({ terminalId: 1 });
exports.AppTerminalSchema.index({ status: 1 });
exports.AppTerminalSchema.index({ type: 1 });
exports.AppTerminalSchema.index({ assignedUserId: 1 });
//# sourceMappingURL=app-terminal.schema.js.map