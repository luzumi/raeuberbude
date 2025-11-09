#!/usr/bin/env node

/**
 * CLI Script zum Import von HomeAssistant-Daten
 * Verwendung: ts-node src/cli/import-ha-data.ts <path-to-json-file>
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { HaImportService } from '../modules/homeassistant/services/ha-import.service';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('❌ Fehler: Kein Dateipfad angegeben');
    console.log('');
    console.log('Verwendung:');
    console.log('  npm run import:ha <pfad-zur-json-datei>');
    console.log('  ts-node src/cli/import-ha-data.ts <pfad-zur-json-datei>');
    console.log('');
    console.log('Beispiel:');
    console.log('  npm run import:ha ../../ha_structure_2025-10-30T11-32-32.058Z.json');
    process.exit(1);
  }

  const filePath = path.resolve(args[0]);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Fehler: Datei nicht gefunden: ${filePath}`);
    process.exit(1);
  }

  if (!filePath.endsWith('.json')) {
    console.error('❌ Fehler: Die Datei muss eine JSON-Datei sein (.json)');
    process.exit(1);
  }

  console.log('🚀 Starte NestJS Anwendung...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const importService = app.get(HaImportService);

  console.log(`📂 Importiere Daten aus: ${filePath}`);
  console.log('⏳ Bitte warten, dies kann einige Minuten dauern...');

  try {
    const startTime = Date.now();
    const snapshot = await importService.importFromFile(filePath);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('');
    console.log('✅ Import erfolgreich abgeschlossen!');
    console.log('');
    console.log('📊 Import-Statistiken:');
    console.log(`  - Snapshot ID: ${snapshot["_id"]}`);
    console.log(`  - HomeAssistant Version: ${snapshot.haVersion}`);
    console.log(`  - Import-Zeit: ${duration} Sekunden`);
    const importDate = snapshot["importDate"] ? new Date(snapshot["importDate"]) : new Date();
    console.log(`  - Import-Datum: ${importDate.toLocaleString('de-DE')}`);

    // Zusätzliche Statistiken abrufen
    const { HaQueryService } = await import('../modules/homeassistant/services/ha-query.service');
    const queryService = app.get(HaQueryService);
    const stats = await queryService.getStatistics();

    console.log('');
    console.log('📈 Datenbank-Statistiken:');
    console.log(`  - Entitäten gesamt: ${stats.totalEntities}`);
    console.log(`  - Geräte: ${stats.totalDevices}`);
    console.log(`  - Bereiche: ${stats.totalAreas}`);
    console.log(`  - Personen: ${stats.totalPersons}`);
    console.log(`  - Automationen: ${stats.totalAutomations}`);
    console.log(`  - Media Player: ${stats.totalMediaPlayers}`);
    console.log(`  - Services: ${stats.totalServices}`);

    if (stats.entitiesByType?.length > 0) {
      console.log('');
      console.log('📋 Entitäten nach Typ:');
      stats.entitiesByType.forEach((type: any) => {
        console.log(`  - ${type.type}: ${type.count}`);
      });
    }

  } catch (error) {
    console.error('');
    console.error('❌ Import fehlgeschlagen:');
    console.error(error.message);

    if (error.stack && process.env.NODE_ENV === 'development') {
      console.error('');
      console.error('Stack Trace:');
      console.error(error.stack);
    }

    await app.close();
    process.exit(1);
  }

  await app.close();
  console.log('');
  console.log('🏁 Anwendung beendet');
  process.exit(0);
}

bootstrap().catch(err => {
  console.error('❌ Kritischer Fehler beim Start:');
  console.error(err);
  process.exit(1);
});
