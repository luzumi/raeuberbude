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
exports.HaAutomationSchema = exports.HaAutomation = exports.AutomationMode = void 0;
const mongoose_1 = require("@nestjs/mongoose");
var AutomationMode;
(function (AutomationMode) {
    AutomationMode["SINGLE"] = "single";
    AutomationMode["RESTART"] = "restart";
    AutomationMode["QUEUED"] = "queued";
    AutomationMode["PARALLEL"] = "parallel";
})(AutomationMode || (exports.AutomationMode = AutomationMode = {}));
let HaAutomation = class HaAutomation {
};
exports.HaAutomation = HaAutomation;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true }),
    __metadata("design:type", String)
], HaAutomation.prototype, "entityId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true }),
    __metadata("design:type", String)
], HaAutomation.prototype, "automationId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], HaAutomation.prototype, "alias", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String }),
    __metadata("design:type", String)
], HaAutomation.prototype, "description", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: Object.values(AutomationMode), default: AutomationMode.SINGLE }),
    __metadata("design:type", String)
], HaAutomation.prototype, "mode", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], HaAutomation.prototype, "current", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number }),
    __metadata("design:type", Number)
], HaAutomation.prototype, "max", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], HaAutomation.prototype, "triggers", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], HaAutomation.prototype, "conditions", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], HaAutomation.prototype, "actions", void 0);
exports.HaAutomation = HaAutomation = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'ha_automations' })
], HaAutomation);
exports.HaAutomationSchema = mongoose_1.SchemaFactory.createForClass(HaAutomation);
//# sourceMappingURL=ha-automation.schema.js.map