#!/usr/bin/env node
/**
 * Migration Script: MongoDB → MariaDB
 *
 * Dieser Script migriert alle Daten von MongoDB nach MariaDB.
 *
 * Ablauf:
 * 1. Alle Tabellen in MariaDB leeren (außer ha_entities, die werden vom Bootstrap befüllt)
 * 2. Warten auf manuellen App-Neustart (damit HA-Daten in MariaDB eingespielt werden)
 * 3. Nacheinander alle Collections aus MongoDB nach MariaDB übertragen (in FK-Reihenfolge)
 *
 * FK-Reihenfolge:
 * 1. app_users (keine Dependencies)
 * 2. app_terminals (FK zu app_users)
 * 3. categories (keine Dependencies)
 * 4. llm_instances (keine Dependencies)
 * 5. transcripts (FK zu app_users, app_terminals, möglicherweise categories)
 * 6. intent_logs (FK zu app_terminals)
 */

// Stub: migrated to scripts/migration/migrate_mongo_to_maria.js
console.log('migrate_mongo_to_maria.js moved to scripts/migration/migrate_mongo_to_maria.js');
