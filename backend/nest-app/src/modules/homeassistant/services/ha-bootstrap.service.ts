import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HaImportService } from './ha-import.service';
import * as fs from 'fs';
import * as path from 'path';

// Controls
// HA_IMPORT_ON_START: 'never' | 'if_empty' | 'always' (default: 'always')
// HA_IMPORT_FILE: absolute or relative path to JSON (optional). If missing, a default file 'ha_structure_*.json' will be searched in common parent folders.
// HA_IMPORT_FAIL_ON_ERROR: 'true' | 'false' (default: 'false')

@Injectable()
export class HaBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(HaBootstrapService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly importService: HaImportService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const mode = (this.config.get<string>('HA_IMPORT_ON_START') || 'always').toLowerCase();
    if (!['never', 'if_empty', 'always'].includes(mode)) {
      this.logger.warn(`HA_IMPORT_ON_START hat einen unbekannten Wert: '${mode}'. Erwarte 'never' | 'if_empty' | 'always'.`);
    }

    if (mode === 'never') {
      this.logger.log('Bootstrap-Import ist deaktiviert (HA_IMPORT_ON_START=never).');
      return;
    }

    const fileFromEnv = this.config.get<string>('HA_IMPORT_FILE');
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
      } catch (e: any) {
        this.logger.error(`Fehler beim Prüfen der Snapshots: ${e?.message}`);
      }
    }

    this.logger.log(`Starte Bootstrap-Import aus Datei: ${jsonPath}`);
    try {
      await this.importService.importFromFile(jsonPath);
      this.logger.log('Bootstrap-Import erfolgreich abgeschlossen.');
    } catch (e: any) {
      const failOnError = (this.config.get<string>('HA_IMPORT_FAIL_ON_ERROR') || 'false').toLowerCase() === 'true';
      this.logger.error(`Bootstrap-Import fehlgeschlagen: ${e?.message}`);
      if (failOnError) {
        throw e;
      }
    }
  }

  private resolveImportFilePath(source?: string): string | undefined {
    if (source) {
      const candidate = path.isAbsolute(source) ? source : path.resolve(process.cwd(), source);
      if (fs.existsSync(candidate)) return candidate;
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
        if (match) return path.join(dir, match);
      } catch {}
    }
    return undefined;
  }
}
