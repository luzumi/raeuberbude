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
var HaBootstrapService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HaBootstrapService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ha_import_service_1 = require("./ha-import.service");
const fs = require("fs");
const path = require("path");
let HaBootstrapService = HaBootstrapService_1 = class HaBootstrapService {
    constructor(config, importService) {
        this.config = config;
        this.importService = importService;
        this.logger = new common_1.Logger(HaBootstrapService_1.name);
    }
    async onApplicationBootstrap() {
        const mode = (this.config.get('HA_IMPORT_ON_START') || 'always').toLowerCase();
        if (!['never', 'if_empty', 'always'].includes(mode)) {
            this.logger.warn(`HA_IMPORT_ON_START hat einen unbekannten Wert: '${mode}'. Erwarte 'never' | 'if_empty' | 'always'.`);
        }
        if (mode === 'never') {
            this.logger.log('Bootstrap-Import ist deaktiviert (HA_IMPORT_ON_START=never).');
            return;
        }
        const fileFromEnv = this.config.get('HA_IMPORT_FILE');
        const jsonPath = this.resolveImportFilePath(fileFromEnv);
        if (!jsonPath) {
            this.logger.warn('Kein Import-File gefunden. Setze HA_IMPORT_FILE oder lege eine Datei ha_structure_*.json an (Repo-Wurzel oder Eltern von CWD).');
            return;
        }
        if (!jsonPath.toLowerCase().endsWith('.json')) {
            this.logger.warn(`Import-File ist keine JSON-Datei: ${jsonPath}`);
            return;
        }
        if (mode === 'if_empty') {
            try {
                const snapshots = await this.importService.getAllSnapshots();
                if (snapshots && snapshots.length > 0) {
                    this.logger.log('Snapshots vorhanden – überspringe Bootstrap-Import (HA_IMPORT_ON_START=if_empty).');
                    return;
                }
            }
            catch (e) {
                this.logger.error(`Fehler beim Prüfen der Snapshots: ${e?.message}`);
            }
        }
        this.logger.log(`Starte Bootstrap-Import aus Datei: ${jsonPath}`);
        try {
            await this.importService.importFromFile(jsonPath);
            this.logger.log('Bootstrap-Import erfolgreich abgeschlossen.');
        }
        catch (e) {
            const failOnError = (this.config.get('HA_IMPORT_FAIL_ON_ERROR') || 'false').toLowerCase() === 'true';
            this.logger.error(`Bootstrap-Import fehlgeschlagen: ${e?.message}`);
            if (failOnError) {
                throw e;
            }
        }
    }
    resolveImportFilePath(source) {
        if (source) {
            const candidate = path.isAbsolute(source) ? source : path.resolve(process.cwd(), source);
            if (fs.existsSync(candidate))
                return candidate;
            this.logger.warn(`HA_IMPORT_FILE gesetzt, aber Datei nicht gefunden: ${candidate}`);
            return undefined;
        }
        const candidates = [
            process.cwd(),
            path.resolve(process.cwd(), '..'),
            path.resolve(process.cwd(), '..', '..'),
            path.resolve(process.cwd(), '..', '..', '..'),
        ];
        const filenameRegex = /^ha_structure_.*\.json$/i;
        for (const dir of candidates) {
            try {
                const entries = fs.readdirSync(dir);
                const match = entries.find((f) => filenameRegex.test(f));
                if (match)
                    return path.join(dir, match);
            }
            catch { }
        }
        return undefined;
    }
};
exports.HaBootstrapService = HaBootstrapService;
exports.HaBootstrapService = HaBootstrapService = HaBootstrapService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        ha_import_service_1.HaImportService])
], HaBootstrapService);
//# sourceMappingURL=ha-bootstrap.service.js.map