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
exports.HumanInputSchema = exports.HumanInput = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let HumanInput = class HumanInput {
};
exports.HumanInput = HumanInput;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], HumanInput.prototype, "userId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'AppTerminal' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], HumanInput.prototype, "terminalId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], HumanInput.prototype, "inputText", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['speech', 'text', 'gesture'], default: 'speech' }),
    __metadata("design:type", String)
], HumanInput.prototype, "inputType", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], HumanInput.prototype, "context", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['pending', 'processed', 'failed'], default: 'pending' }),
    __metadata("design:type", String)
], HumanInput.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], HumanInput.prototype, "processedResponse", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date }),
    __metadata("design:type", Date)
], HumanInput.prototype, "processedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], HumanInput.prototype, "metadata", void 0);
exports.HumanInput = HumanInput = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], HumanInput);
exports.HumanInputSchema = mongoose_1.SchemaFactory.createForClass(HumanInput);
exports.HumanInputSchema.index({ userId: 1, createdAt: -1 });
exports.HumanInputSchema.index({ terminalId: 1, createdAt: -1 });
exports.HumanInputSchema.index({ status: 1 });
exports.HumanInputSchema.index({ inputType: 1 });
//# sourceMappingURL=human-input.schema.js.map