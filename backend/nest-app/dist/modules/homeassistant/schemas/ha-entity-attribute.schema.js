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
exports.HaEntityAttributeSchema = exports.HaEntityAttribute = exports.AttributeType = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
var AttributeType;
(function (AttributeType) {
    AttributeType["STRING"] = "string";
    AttributeType["NUMBER"] = "number";
    AttributeType["BOOLEAN"] = "boolean";
    AttributeType["ARRAY"] = "array";
    AttributeType["OBJECT"] = "object";
})(AttributeType || (exports.AttributeType = AttributeType = {}));
let HaEntityAttribute = class HaEntityAttribute {
};
exports.HaEntityAttribute = HaEntityAttribute;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, required: true, ref: 'HaEntityState' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], HaEntityAttribute.prototype, "entityStateId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], HaEntityAttribute.prototype, "attributeKey", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, required: false, default: null }),
    __metadata("design:type", Object)
], HaEntityAttribute.prototype, "attributeValue", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: Object.values(AttributeType), required: true }),
    __metadata("design:type", String)
], HaEntityAttribute.prototype, "attributeType", void 0);
exports.HaEntityAttribute = HaEntityAttribute = __decorate([
    (0, mongoose_1.Schema)({ timestamps: { createdAt: 'createdAt', updatedAt: false }, collection: 'ha_entity_attributes' })
], HaEntityAttribute);
exports.HaEntityAttributeSchema = mongoose_1.SchemaFactory.createForClass(HaEntityAttribute);
//# sourceMappingURL=ha-entity-attribute.schema.js.map