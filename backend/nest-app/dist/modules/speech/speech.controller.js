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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var SpeechController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpeechController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const speech_service_1 = require("./speech.service");
const rights_service_1 = require("./rights.service");
const terminals_service_1 = require("./terminals.service");
const create_human_input_dto_1 = require("./dto/create-human-input.dto");
const update_human_input_dto_1 = require("./dto/update-human-input.dto");
const create_app_terminal_dto_1 = require("./dto/create-app-terminal.dto");
const update_app_terminal_dto_1 = require("./dto/update-app-terminal.dto");
const create_user_rights_dto_1 = require("./dto/create-user-rights.dto");
const update_user_rights_dto_1 = require("./dto/update-user-rights.dto");
let SpeechController = SpeechController_1 = class SpeechController {
    constructor(speechService, rightsService, terminalsService) {
        this.speechService = speechService;
        this.rightsService = rightsService;
        this.terminalsService = terminalsService;
        this.logger = new common_1.Logger(SpeechController_1.name);
    }
    async createInput(createDto, req) {
        await this.rightsService.checkPermission(createDto.userId, 'speech.use');
        if (createDto.terminalId) {
            await this.terminalsService.updateActivity(createDto.terminalId);
        }
        const input = await this.speechService.create(createDto);
        this.logger.log(`Created input from user ${createDto.userId}`);
        return {
            success: true,
            data: input,
            message: 'Speech input recorded successfully',
        };
    }
    async getInputs(userId, terminalId, status, inputType, startDate, endDate, limit, skip) {
        const filters = { userId, terminalId, status, inputType, startDate, endDate };
        const options = { limit, skip };
        const inputs = await this.speechService.findAll(filters, options);
        return {
            success: true,
            data: inputs,
            count: inputs.length,
        };
    }
    async getLatestInputs(count = 10) {
        const inputs = await this.speechService.findLatest(count);
        return {
            success: true,
            data: inputs,
            count: inputs.length,
        };
    }
    async getUserInputs(userId, limit, skip) {
        const inputs = await this.speechService.findByUser(userId, { limit, skip });
        return {
            success: true,
            data: inputs,
            count: inputs.length,
        };
    }
    async getInput(id) {
        const input = await this.speechService.findOne(id);
        return {
            success: true,
            data: input,
        };
    }
    async updateInput(id, updateDto) {
        const input = await this.speechService.update(id, updateDto);
        return {
            success: true,
            data: input,
            message: 'Input updated successfully',
        };
    }
    async deleteInput(id) {
        await this.speechService.delete(id);
    }
    async getInputStats(userId) {
        const stats = await this.speechService.getStatistics(userId);
        return {
            success: true,
            data: stats,
        };
    }
    async createTerminal(createDto) {
        const terminal = await this.terminalsService.create(createDto);
        return {
            success: true,
            data: terminal,
            message: 'Terminal created successfully',
        };
    }
    async registerTerminal(terminalData) {
        const terminal = await this.terminalsService.registerTerminal(terminalData);
        return {
            success: true,
            data: terminal,
            message: 'Terminal registered successfully',
        };
    }
    async getTerminals(type, status, location) {
        const filters = { type, status, location };
        const terminals = await this.terminalsService.findAll(filters);
        return {
            success: true,
            data: terminals,
            count: terminals.length,
        };
    }
    async getActiveTerminals() {
        const terminals = await this.terminalsService.getActiveTerminals();
        return {
            success: true,
            data: terminals,
            count: terminals.length,
        };
    }
    async getTerminalStats() {
        const stats = await this.terminalsService.getStatistics();
        return {
            success: true,
            data: stats,
        };
    }
    async getTerminal(id) {
        const terminal = await this.terminalsService.findOne(id);
        return {
            success: true,
            data: terminal,
        };
    }
    async updateTerminal(id, updateDto) {
        const terminal = await this.terminalsService.update(id, updateDto);
        return {
            success: true,
            data: terminal,
            message: 'Terminal updated successfully',
        };
    }
    async updateTerminalStatus(id, status) {
        const terminal = await this.terminalsService.setStatus(id, status);
        return {
            success: true,
            data: terminal,
            message: `Terminal status updated to ${status}`,
        };
    }
    async assignTerminal(id, userId) {
        const terminal = await this.terminalsService.assignUser(id, userId);
        return {
            success: true,
            data: terminal,
            message: userId ? 'Terminal assigned successfully' : 'Terminal unassigned',
        };
    }
    async deleteTerminal(id) {
        await this.terminalsService.delete(id);
    }
    async createRights(createDto) {
        const rights = await this.rightsService.create(createDto);
        return {
            success: true,
            data: rights,
            message: 'User rights created successfully',
        };
    }
    async getRights(role, status) {
        const filters = { role, status };
        const rights = await this.rightsService.findAll(filters);
        return {
            success: true,
            data: rights,
            count: rights.length,
        };
    }
    async getRightsStats() {
        const stats = await this.rightsService.getRoleStatistics();
        return {
            success: true,
            data: stats,
        };
    }
    async getUserRights(userId) {
        const rights = await this.rightsService.findByUserId(userId);
        return {
            success: true,
            data: rights,
        };
    }
    async updateRights(userId, updateDto) {
        const rights = await this.rightsService.update(userId, updateDto);
        return {
            success: true,
            data: rights,
            message: 'User rights updated successfully',
        };
    }
    async assignRole(userId, role) {
        const rights = await this.rightsService.assignRole(userId, role);
        return {
            success: true,
            data: rights,
            message: `Role ${role} assigned successfully`,
        };
    }
    async grantPermission(userId, permission) {
        const rights = await this.rightsService.grantPermission(userId, permission);
        return {
            success: true,
            data: rights,
            message: `Permission ${permission} granted`,
        };
    }
    async revokePermission(userId, permission) {
        const rights = await this.rightsService.revokePermission(userId, permission);
        return {
            success: true,
            data: rights,
            message: `Permission ${permission} revoked`,
        };
    }
    async suspendUser(userId, reason) {
        const rights = await this.rightsService.suspendUser(userId, reason);
        return {
            success: true,
            data: rights,
            message: 'User suspended',
        };
    }
    async activateUser(userId) {
        const rights = await this.rightsService.activateUser(userId);
        return {
            success: true,
            data: rights,
            message: 'User activated',
        };
    }
    async deleteRights(userId) {
        await this.rightsService.delete(userId);
    }
    async checkPermission(userId, permission) {
        const hasPermission = await this.rightsService.hasPermission(userId, permission);
        return {
            success: true,
            hasPermission,
        };
    }
};
exports.SpeechController = SpeechController;
__decorate([
    (0, common_1.Post)('input'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new human input record' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Input created successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Bad request' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - insufficient rights' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_human_input_dto_1.CreateHumanInputDto, Object]),
    __metadata("design:returntype", Promise)
], SpeechController.prototype, "createInput", null);
__decorate([
    (0, common_1.Get)('inputs'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all human inputs with filters' }),
    (0, swagger_1.ApiQuery)({ name: 'userId', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'terminalId', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'inputType', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'startDate', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'endDate', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'skip', required: false, type: Number }),
    __param(0, (0, common_1.Query)('userId')),
    __param(1, (0, common_1.Query)('terminalId')),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('inputType')),
    __param(4, (0, common_1.Query)('startDate')),
    __param(5, (0, common_1.Query)('endDate')),
    __param(6, (0, common_1.Query)('limit')),
    __param(7, (0, common_1.Query)('skip')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, Number, Number]),
    __metadata("design:returntype", Promise)
], SpeechController.prototype, "getInputs", null);
__decorate([
    (0, common_1.Get)('inputs/latest'),
    (0, swagger_1.ApiOperation)({ summary: 'Get latest human inputs' }),
    (0, swagger_1.ApiQuery)({ name: 'count', required: false, type: Number }),
    __param(0, (0, common_1.Query)('count')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], SpeechController.prototype, "getLatestInputs", null);
__decorate([
    (0, common_1.Get)('inputs/user/:userId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get inputs by user' }),
    (0, swagger_1.ApiParam)({ name: 'userId', description: 'User ID' }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('skip')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", Promise)
], SpeechController.prototype, "getUserInputs", null);
__decorate([
    (0, common_1.Get)('inputs/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a specific human input by ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Input ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SpeechController.prototype, "getInput", null);
__decorate([
    (0, common_1.Put)('inputs/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a human input' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Input ID' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_human_input_dto_1.UpdateHumanInputDto]),
    __metadata("design:returntype", Promise)
], SpeechController.prototype, "updateInput", null);
__decorate([
    (0, common_1.Delete)('inputs/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a human input' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Input ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SpeechController.prototype, "deleteInput", null);
__decorate([
    (0, common_1.Get)('inputs/stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Get input statistics' }),
    (0, swagger_1.ApiQuery)({ name: 'userId', required: false }),
    __param(0, (0, common_1.Query)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SpeechController.prototype, "getInputStats", null);
__decorate([
    (0, common_1.Post)('terminals'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new app terminal' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_app_terminal_dto_1.CreateAppTerminalDto]),
    __metadata("design:returntype", Promise)
], SpeechController.prototype, "createTerminal", null);
__decorate([
    (0, common_1.Post)('terminals/register'),
    (0, swagger_1.ApiOperation)({ summary: 'Register or update a terminal' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SpeechController.prototype, "registerTerminal", null);
__decorate([
    (0, common_1.Get)('terminals'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all terminals' }),
    (0, swagger_1.ApiQuery)({ name: 'type', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'location', required: false }),
    __param(0, (0, common_1.Query)('type')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('location')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], SpeechController.prototype, "getTerminals", null);
__decorate([
    (0, common_1.Get)('terminals/active'),
    (0, swagger_1.ApiOperation)({ summary: 'Get active terminals' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SpeechController.prototype, "getActiveTerminals", null);
__decorate([
    (0, common_1.Get)('terminals/stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Get terminal statistics' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SpeechController.prototype, "getTerminalStats", null);
__decorate([
    (0, common_1.Get)('terminals/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a specific terminal' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Terminal ID or terminalId' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SpeechController.prototype, "getTerminal", null);
__decorate([
    (0, common_1.Put)('terminals/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a terminal' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Terminal ID or terminalId' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_app_terminal_dto_1.UpdateAppTerminalDto]),
    __metadata("design:returntype", Promise)
], SpeechController.prototype, "updateTerminal", null);
__decorate([
    (0, common_1.Put)('terminals/:id/status'),
    (0, swagger_1.ApiOperation)({ summary: 'Update terminal status' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Terminal ID' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SpeechController.prototype, "updateTerminalStatus", null);
__decorate([
    (0, common_1.Put)('terminals/:id/assign'),
    (0, swagger_1.ApiOperation)({ summary: 'Assign user to terminal' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Terminal ID' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SpeechController.prototype, "assignTerminal", null);
__decorate([
    (0, common_1.Delete)('terminals/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a terminal' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Terminal ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SpeechController.prototype, "deleteTerminal", null);
__decorate([
    (0, common_1.Post)('rights'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Create user rights' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_user_rights_dto_1.CreateUserRightsDto]),
    __metadata("design:returntype", Promise)
], SpeechController.prototype, "createRights", null);
__decorate([
    (0, common_1.Get)('rights'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all user rights' }),
    (0, swagger_1.ApiQuery)({ name: 'role', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false }),
    __param(0, (0, common_1.Query)('role')),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SpeechController.prototype, "getRights", null);
__decorate([
    (0, common_1.Get)('rights/stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Get rights statistics' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SpeechController.prototype, "getRightsStats", null);
__decorate([
    (0, common_1.Get)('rights/user/:userId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get rights for a specific user' }),
    (0, swagger_1.ApiParam)({ name: 'userId', description: 'User ID' }),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SpeechController.prototype, "getUserRights", null);
__decorate([
    (0, common_1.Put)('rights/user/:userId'),
    (0, swagger_1.ApiOperation)({ summary: 'Update user rights' }),
    (0, swagger_1.ApiParam)({ name: 'userId', description: 'User ID' }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_user_rights_dto_1.UpdateUserRightsDto]),
    __metadata("design:returntype", Promise)
], SpeechController.prototype, "updateRights", null);
__decorate([
    (0, common_1.Put)('rights/user/:userId/role'),
    (0, swagger_1.ApiOperation)({ summary: 'Assign role to user' }),
    (0, swagger_1.ApiParam)({ name: 'userId', description: 'User ID' }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Body)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SpeechController.prototype, "assignRole", null);
__decorate([
    (0, common_1.Put)('rights/user/:userId/permission/grant'),
    (0, swagger_1.ApiOperation)({ summary: 'Grant permission to user' }),
    (0, swagger_1.ApiParam)({ name: 'userId', description: 'User ID' }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Body)('permission')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SpeechController.prototype, "grantPermission", null);
__decorate([
    (0, common_1.Put)('rights/user/:userId/permission/revoke'),
    (0, swagger_1.ApiOperation)({ summary: 'Revoke permission from user' }),
    (0, swagger_1.ApiParam)({ name: 'userId', description: 'User ID' }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Body)('permission')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SpeechController.prototype, "revokePermission", null);
__decorate([
    (0, common_1.Put)('rights/user/:userId/suspend'),
    (0, swagger_1.ApiOperation)({ summary: 'Suspend user' }),
    (0, swagger_1.ApiParam)({ name: 'userId', description: 'User ID' }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Body)('reason')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SpeechController.prototype, "suspendUser", null);
__decorate([
    (0, common_1.Put)('rights/user/:userId/activate'),
    (0, swagger_1.ApiOperation)({ summary: 'Activate user' }),
    (0, swagger_1.ApiParam)({ name: 'userId', description: 'User ID' }),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SpeechController.prototype, "activateUser", null);
__decorate([
    (0, common_1.Delete)('rights/user/:userId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Delete user rights' }),
    (0, swagger_1.ApiParam)({ name: 'userId', description: 'User ID' }),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SpeechController.prototype, "deleteRights", null);
__decorate([
    (0, common_1.Get)('rights/check/:userId/:permission'),
    (0, swagger_1.ApiOperation)({ summary: 'Check if user has permission' }),
    (0, swagger_1.ApiParam)({ name: 'userId', description: 'User ID' }),
    (0, swagger_1.ApiParam)({ name: 'permission', description: 'Permission to check' }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Param)('permission')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SpeechController.prototype, "checkPermission", null);
exports.SpeechController = SpeechController = SpeechController_1 = __decorate([
    (0, swagger_1.ApiTags)('speech'),
    (0, common_1.Controller)('api/speech'),
    __metadata("design:paramtypes", [speech_service_1.SpeechService,
        rights_service_1.RightsService,
        terminals_service_1.TerminalsService])
], SpeechController);
//# sourceMappingURL=speech.controller.js.map