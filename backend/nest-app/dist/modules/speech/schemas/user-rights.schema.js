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
exports.ROLE_PERMISSIONS = exports.PERMISSIONS = exports.UserRightsSchema = exports.UserRights = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let UserRights = class UserRights {
};
exports.UserRights = UserRights;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], UserRights.prototype, "userId", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: ['admin', 'manager', 'regular', 'guest', 'terminal'],
        required: true,
        default: 'regular'
    }),
    __metadata("design:type", String)
], UserRights.prototype, "role", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], UserRights.prototype, "permissions", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [mongoose_2.Types.ObjectId], ref: 'AppTerminal', default: [] }),
    __metadata("design:type", Array)
], UserRights.prototype, "allowedTerminals", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], UserRights.prototype, "restrictions", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean, default: true }),
    __metadata("design:type", Boolean)
], UserRights.prototype, "canUseSpeechInput", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean, default: false }),
    __metadata("design:type", Boolean)
], UserRights.prototype, "canManageTerminals", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean, default: false }),
    __metadata("design:type", Boolean)
], UserRights.prototype, "canManageUsers", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean, default: true }),
    __metadata("design:type", Boolean)
], UserRights.prototype, "canViewOwnInputs", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean, default: false }),
    __metadata("design:type", Boolean)
], UserRights.prototype, "canViewAllInputs", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean, default: false }),
    __metadata("design:type", Boolean)
], UserRights.prototype, "canDeleteInputs", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date }),
    __metadata("design:type", Date)
], UserRights.prototype, "expiresAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['active', 'suspended', 'revoked'], default: 'active' }),
    __metadata("design:type", String)
], UserRights.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], UserRights.prototype, "metadata", void 0);
exports.UserRights = UserRights = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], UserRights);
exports.UserRightsSchema = mongoose_1.SchemaFactory.createForClass(UserRights);
exports.UserRightsSchema.index({ userId: 1 });
exports.UserRightsSchema.index({ role: 1 });
exports.UserRightsSchema.index({ status: 1 });
exports.UserRightsSchema.index({ expiresAt: 1 });
exports.PERMISSIONS = {
    SPEECH_USE: 'speech.use',
    SPEECH_VIEW_OWN: 'speech.view.own',
    SPEECH_VIEW_ALL: 'speech.view.all',
    SPEECH_DELETE: 'speech.delete',
    TERMINAL_VIEW: 'terminal.view',
    TERMINAL_CREATE: 'terminal.create',
    TERMINAL_EDIT: 'terminal.edit',
    TERMINAL_DELETE: 'terminal.delete',
    TERMINAL_ASSIGN: 'terminal.assign',
    USER_VIEW: 'user.view',
    USER_CREATE: 'user.create',
    USER_EDIT: 'user.edit',
    USER_DELETE: 'user.delete',
    USER_MANAGE_RIGHTS: 'user.manage.rights',
    SYSTEM_ADMIN: 'system.admin',
    SYSTEM_MONITOR: 'system.monitor',
    SYSTEM_LOGS: 'system.logs',
};
exports.ROLE_PERMISSIONS = {
    admin: Object.values(exports.PERMISSIONS),
    manager: [
        exports.PERMISSIONS.SPEECH_USE,
        exports.PERMISSIONS.SPEECH_VIEW_OWN,
        exports.PERMISSIONS.SPEECH_VIEW_ALL,
        exports.PERMISSIONS.TERMINAL_VIEW,
        exports.PERMISSIONS.TERMINAL_EDIT,
        exports.PERMISSIONS.USER_VIEW,
        exports.PERMISSIONS.USER_MANAGE_RIGHTS,
        exports.PERMISSIONS.SYSTEM_MONITOR,
    ],
    regular: [
        exports.PERMISSIONS.SPEECH_USE,
        exports.PERMISSIONS.SPEECH_VIEW_OWN,
        exports.PERMISSIONS.TERMINAL_VIEW,
    ],
    guest: [
        exports.PERMISSIONS.SPEECH_USE,
        exports.PERMISSIONS.SPEECH_VIEW_OWN,
    ],
    terminal: [
        exports.PERMISSIONS.SPEECH_USE,
    ],
};
//# sourceMappingURL=user-rights.schema.js.map