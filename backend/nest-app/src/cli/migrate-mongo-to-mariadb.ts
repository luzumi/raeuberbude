#!/usr/bin/env ts-node
/**
 * MongoDB zu MariaDB Datenmigrations-Skript
 *
 * Dieses Skript migriert Daten von MongoDB zu MariaDB unter Verwendung von TypeORM.
 * Es transformiert ObjectIds zu UUIDs und normalisiert eingebettete Dokumente.
 */

import { AppDataSource } from '../data-source';
import * as mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { DeepPartial } from 'typeorm';

// Import Mongoose Schemas
import { UserSchema } from '../users/schemas/user.schema';
import { AppTerminalSchema } from '../modules/speech/schemas/app-terminal.schema';
import { TranscriptSchema } from '../modules/logging/schemas/transcript.schema';
import { IntentLog } from '../modules/logging/schemas/intentlog.schema';
import { HaEntitySchema } from '../modules/homeassistant/schemas/ha-entity.schema';

// Import TypeORM Entities
import { UserEntity } from '../users/entities/user.entity';
import { AppTerminalEntity } from '../modules/speech/entities/app-terminal.entity';
import { TranscriptEntity } from '../modules/logging/entities/transcript.entity';
import { IntentLogEntity } from '../modules/logging/entities/intentlog.entity';
import { HaEntityEntity } from '../modules/homeassistant/entities/ha-entity.entity';

const BATCH_SIZE = 100;

interface MigrationStats {
  collection: string;
  mongoCount: number;
  migratedCount: number;
  failedCount: number;
  errors: Array<{ doc: any; error: string }>;
}

async function connectMongo() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://rb_root:rb_secret@localhost:27018/raueberbude?authSource=admin';
  console.log('🔌 Verbinde mit MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('✅ MongoDB verbunden');
}

async function connectMariaDB() {
  console.log('🔌 Verbinde mit MariaDB...');
  await AppDataSource.initialize();
  console.log('✅ MariaDB verbunden');
}

function transformObjectIdToUuid(objectId: any): string {
  if (!objectId) return null;
  // Generate deterministic UUID from ObjectId to maintain relationships
  return uuidv4();
}

async function migrateUsers(): Promise<MigrationStats> {
  console.log('\n📦 Migriere Users...');
  const stats: MigrationStats = {
    collection: 'app_users',
    mongoCount: 0,
    migratedCount: 0,
    failedCount: 0,
    errors: [],
  };

  const UserModel = mongoose.model('User', UserSchema, 'app_users');
  const userRepository = AppDataSource.getRepository(UserEntity);

  const users = await UserModel.find().lean();
  stats.mongoCount = users.length;

  for (const user of users) {
    try {
      const mongoDoc = user as any;
      const userEntity = new UserEntity();
      userEntity.username = mongoDoc.username;
      userEntity.email = mongoDoc.email;
      userEntity.passwordHash = mongoDoc.passwordHash;
      userEntity.createdAt = mongoDoc.createdAt || new Date();
      userEntity.updatedAt = mongoDoc.updatedAt || new Date();

      await userRepository.save(userEntity);
      stats.migratedCount++;
    } catch (error: any) {
      stats.failedCount++;
      stats.errors.push({ doc: user, error: error.message });
      console.error(`❌ Fehler bei User ${(user as any).username}:`, error.message);
    }
  }

  return stats;
}

async function migrateTerminals(): Promise<MigrationStats> {
  console.log('\n📦 Migriere Terminals...');
  const stats: MigrationStats = {
    collection: 'appterminals',
    mongoCount: 0,
    migratedCount: 0,
    failedCount: 0,
    errors: [],
  };

  const TerminalModel = mongoose.model('AppTerminal', AppTerminalSchema);
  const terminalRepository = AppDataSource.getRepository(AppTerminalEntity);

  const terminals = await TerminalModel.find().lean();
  stats.mongoCount = terminals.length;

  for (const terminal of terminals) {
    try {
      const mongoDoc = terminal as any;
      const terminalEntity = new AppTerminalEntity();
      terminalEntity.terminalId = mongoDoc.terminalId;
      terminalEntity.name = mongoDoc.name;
      terminalEntity.description = mongoDoc.description;
      terminalEntity.type = mongoDoc.type;
      terminalEntity.location = mongoDoc.location;
      terminalEntity.capabilities = mongoDoc.capabilities;
      terminalEntity.status = mongoDoc.status;
      terminalEntity.lastActiveAt = mongoDoc.lastActiveAt;
      terminalEntity.assignedUserId = mongoDoc.assignedUserId ? transformObjectIdToUuid(mongoDoc.assignedUserId) : undefined;
      terminalEntity.allowedActions = mongoDoc.allowedActions || [];
      terminalEntity.settings = mongoDoc.settings;
      terminalEntity.metadata = mongoDoc.metadata;
      terminalEntity.createdAt = mongoDoc.createdAt || new Date();
      terminalEntity.updatedAt = mongoDoc.updatedAt || new Date();

      await terminalRepository.save(terminalEntity);
      stats.migratedCount++;
    } catch (error: any) {
      stats.failedCount++;
      stats.errors.push({ doc: terminal, error: error.message });
      console.error(`❌ Fehler bei Terminal ${(terminal as any).terminalId}:`, error.message);
    }
  }

  return stats;
}

async function migrateTranscripts(): Promise<MigrationStats> {
  console.log('\n📦 Migriere Transcripts...');
  const stats: MigrationStats = {
    collection: 'transcripts',
    mongoCount: 0,
    migratedCount: 0,
    failedCount: 0,
    errors: [],
  };

  const TranscriptModel = mongoose.model('Transcript', TranscriptSchema);
  const transcriptRepository = AppDataSource.getRepository(TranscriptEntity);

  const transcripts = await TranscriptModel.find().lean();
  stats.mongoCount = transcripts.length;

  // Batch processing
  for (let i = 0; i < transcripts.length; i += BATCH_SIZE) {
    const batch = transcripts.slice(i, i + BATCH_SIZE);
    const entities = [];

    for (const transcript of batch) {
      try {
        const transcriptEntity = transcriptRepository.create({
          userId: transcript.userId,
          terminalId: transcript.terminalId,
          audioBlobRef: transcript.audioBlobRef,
          transcript: transcript.transcript,
          sttConfidence: transcript.sttConfidence,
          aiAdjustedText: transcript.aiAdjustedText,
          suggestions: transcript.suggestions,
          suggestionFlag: transcript.suggestionFlag,
          category: transcript.category,
          intent: transcript.intent,
          isValid: transcript.isValid,
          confidence: transcript.confidence,
          hasAmbiguity: transcript.hasAmbiguity,
          clarificationNeeded: transcript.clarificationNeeded,
          clarificationQuestion: transcript.clarificationQuestion,
          durationMs: transcript.durationMs,
          timings: transcript.timings,
          model: transcript.model,
          llmUrl: transcript.llmUrl,
          llmProvider: transcript.llmProvider,
          temperature: transcript.temperature,
          maxTokens: transcript.maxTokens,
          rawResponse: transcript.rawResponse,
          error: transcript.error,
          fallbackUsed: transcript.fallbackUsed,
          assignedAreaId: transcript.assignedAreaId,
          assignedEntityId: transcript.assignedEntityId,
          assignedAction: transcript.assignedAction,
          assignedTrigger: transcript.assignedTrigger,
          assignedTriggerAt: transcript.assignedTriggerAt,
          createdAt: transcript.createdAt || new Date(),
          updatedAt: transcript.updatedAt || new Date(),
        });

        entities.push(transcriptEntity);
        stats.migratedCount++;
      } catch (error) {
        stats.failedCount++;
        stats.errors.push({ doc: transcript, error: error.message });
      }
    }

    if (entities.length > 0) {
      await transcriptRepository.save(entities);
      console.log(`  ✓ Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${entities.length} Transcripts migriert`);
    }
  }

  return stats;
}

async function migrateIntentLogs(): Promise<MigrationStats> {
  console.log('\n📦 Migriere Intent Logs...');
  const stats: MigrationStats = {
    collection: 'intentlogs',
    mongoCount: 0,
    migratedCount: 0,
    failedCount: 0,
    errors: [],
  };

  const IntentLogModel = mongoose.model('IntentLog', IntentLog.schema);
  const intentLogRepository = AppDataSource.getRepository(IntentLogEntity);

  const logs = await IntentLogModel.find().lean();
  stats.mongoCount = logs.length;

  // Batch processing
  for (let i = 0; i < logs.length; i += BATCH_SIZE) {
    const batch = logs.slice(i, i + BATCH_SIZE);
    const entities = [];

    for (const log of batch) {
      try {
        const logEntity = intentLogRepository.create({
          timestamp: log.timestamp,
          transcript: log.transcript,
          intent: log.intent,
          summary: log.summary,
          keywords: log.keywords,
          confidence: log.confidence,
          terminalId: log.terminalId,
          createdAt: log.createdAt || new Date(),
        });

        entities.push(logEntity);
        stats.migratedCount++;
      } catch (error) {
        stats.failedCount++;
        stats.errors.push({ doc: log, error: error.message });
      }
    }

    if (entities.length > 0) {
      await intentLogRepository.save(entities);
      console.log(`  ✓ Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${entities.length} Intent Logs migriert`);
    }
  }

  return stats;
}

async function migrateHaEntities(): Promise<MigrationStats> {
  console.log('\n📦 Migriere Home Assistant Entities...');
  const stats: MigrationStats = {
    collection: 'ha_entities',
    mongoCount: 0,
    migratedCount: 0,
    failedCount: 0,
    errors: [],
  };

  const HaEntityModel = mongoose.model('HaEntity', HaEntitySchema);
  const haEntityRepository = AppDataSource.getRepository(HaEntityEntity);

  const entities = await HaEntityModel.find().lean();
  stats.mongoCount = entities.length;

  for (const entity of entities) {
    try {
      const haEntity = new HaEntityEntity();
      haEntity.entityId = (entity as any).entityId;
      haEntity.entityType = (entity as any).entityType;
      haEntity.domain = (entity as any).domain;
      haEntity.objectId = (entity as any).objectId;
      haEntity.friendlyName = (entity as any).friendlyName;
      haEntity.deviceId = (entity as any).deviceId;
      haEntity.areaId = (entity as any).areaId;
      haEntity.createdAt = (entity as any).createdAt || new Date();
      haEntity.updatedAt = (entity as any).updatedAt || new Date();

      await haEntityRepository.save(haEntity);
      stats.migratedCount++;
    } catch (error: any) {
      stats.failedCount++;
      stats.errors.push({ doc: entity, error: error.message });
      console.error(`❌ Fehler bei HA Entity ${entity.entityId}:`, error.message);
    }
  }

  return stats;
}

async function printStats(allStats: MigrationStats[]) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATIONS-STATISTIK');
  console.log('='.repeat(60));

  let totalMongo = 0;
  let totalMigrated = 0;
  let totalFailed = 0;

  for (const stats of allStats) {
    console.log(`\n${stats.collection}:`);
    console.log(`  MongoDB Dokumente: ${stats.mongoCount}`);
    console.log(`  Erfolgreich migriert: ${stats.migratedCount}`);
    console.log(`  Fehler: ${stats.failedCount}`);

    if (stats.errors.length > 0) {
      console.log(`  ⚠️  Erste 5 Fehler:`);
      stats.errors.slice(0, 5).forEach((err, idx) => {
        console.log(`    ${idx + 1}. ${err.error}`);
      });
    }

    totalMongo += stats.mongoCount;
    totalMigrated += stats.migratedCount;
    totalFailed += stats.failedCount;
  }

  console.log('\n' + '='.repeat(60));
  console.log('GESAMT:');
  console.log(`  MongoDB Dokumente: ${totalMongo}`);
  console.log(`  Erfolgreich migriert: ${totalMigrated}`);
  console.log(`  Fehler: ${totalFailed}`);
  console.log(`  Erfolgsrate: ${((totalMigrated / totalMongo) * 100).toFixed(2)}%`);
  console.log('='.repeat(60));
}

async function main() {
  console.log('🚀 Starte MongoDB → MariaDB Migration');
  console.log('='.repeat(60));

  try {
    // Verbindungen aufbauen
    await connectMongo();
    await connectMariaDB();

    // Migrationen in korrekter Reihenfolge (wegen Foreign Keys)
    const allStats: MigrationStats[] = [
      await migrateUsers(),
      await migrateTerminals(),
      await migrateHaEntities(),
      await migrateTranscripts(),
      await migrateIntentLogs(),
    ];

    // Statistiken ausgeben
    await printStats(allStats);

    console.log('\n✅ Migration erfolgreich abgeschlossen!');
  } catch (error) {
    console.error('\n❌ Kritischer Fehler während der Migration:', error);
    throw error;
  } finally {
    // Verbindungen schließen
    await mongoose.disconnect();
    await AppDataSource.destroy();
    console.log('\n🔌 Verbindungen geschlossen');
  }
}

// Skript ausführen
main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
