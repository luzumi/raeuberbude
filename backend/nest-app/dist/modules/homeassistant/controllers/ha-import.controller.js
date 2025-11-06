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
Object.defineProperty(exports, "__esModule", { value: true });
exports.HaImportController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const ha_import_service_1 = require("../services/ha-import.service");
const fs = require("node:fs");
const path = require("node:path");
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
let HaImportController = class HaImportController {
    constructor(importService) {
        this.importService = importService;
    }
    async importFile(file) {
        if (!fs.existsSync(UPLOAD_DIR)) {
            fs.mkdirSync(UPLOAD_DIR, { recursive: true });
        }
        if (!file) {
            throw new Error('No file uploaded');
        }
        try {
            const snapshot = await this.importService.importFromFile(file.path);
            fs.unlinkSync(file.path);
            return snapshot;
        }
        catch (error) {
            if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }
            throw error;
        }
    }
    async importJson(data) {
        const tempPath = path.join(UPLOAD_DIR, `temp-${Date.now()}.json`);
        if (!fs.existsSync(UPLOAD_DIR)) {
            fs.mkdirSync(UPLOAD_DIR, { recursive: true });
        }
        fs.writeFileSync(tempPath, JSON.stringify(data));
        try {
            const snapshot = await this.importService.importFromFile(tempPath);
            fs.unlinkSync(tempPath);
            return snapshot;
        }
        catch (error) {
            if (fs.existsSync(tempPath)) {
                fs.unlinkSync(tempPath);
            }
            throw error;
        }
    }
    async getSnapshots() {
        return await this.importService.getAllSnapshots();
    }
    async getSnapshot(id) {
        return await this.importService.getSnapshot(id);
    }
};
exports.HaImportController = HaImportController;
__decorate([
    (0, common_1.Post)('file'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        dest: UPLOAD_DIR,
        fileFilter: (req, file, cb) => {
            if (file.mimetype !== 'application/json') {
                return cb(new Error('Only JSON files are allowed'), false);
            }
            cb(null, true);
        }
    })),
    (0, swagger_1.ApiOperation)({ summary: 'Import HomeAssistant data from JSON file' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Import successful' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid file' }),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], HaImportController.prototype, "importFile", null);
__decorate([
    (0, common_1.Post)('json'),
    (0, swagger_1.ApiOperation)({ summary: 'Import HomeAssistant data from JSON body' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Import successful' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid data' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], HaImportController.prototype, "importJson", null);
__decorate([
    (0, common_1.Get)('snapshots'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all import snapshots' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of snapshots' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HaImportController.prototype, "getSnapshots", null);
__decorate([
    (0, common_1.Get)('snapshots/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get specific snapshot details' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Snapshot details' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Snapshot not found' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], HaImportController.prototype, "getSnapshot", null);
exports.HaImportController = HaImportController = __decorate([
    (0, swagger_1.ApiTags)('HomeAssistant Import'),
    (0, common_1.Controller)('api/homeassistant/import'),
    __metadata("design:paramtypes", [ha_import_service_1.HaImportService])
], HaImportController);
//# sourceMappingURL=ha-import.controller.js.map