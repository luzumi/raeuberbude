# DBM-SCHEMA-05: Daten-Typen und Konvertierung MongoDB → MariaDB

## Ziel
**Keine bösen Überraschungen**: 1:1 Datenkompatibilität zwischen MongoDB und MariaDB ohne Datenverlust, Truncation oder unerwartetes Verhalten.

---

## Globale Konvertierungsregeln

### Basis-Typen

| MongoDB Typ | MariaDB Typ | Regeln | Beispiel |
|-------------|-------------|---------|----------|
| `String` (kurz) | `VARCHAR(n)` | n = max erwartete Länge + 20% Buffer | userId: `VARCHAR(255)` |
| `String` (lang/unbegrenzt) | `TEXT` | Für Transkripte, Fehler, JSON | transcript: `TEXT` |
| `String` (fixe Länge) | `CHAR(n)` | Für UUIDs, Hashes | UUID: `CHAR(36)` |
| `Number` (0-1 float) | `DECIMAL(3,2)` | Confidence-Werte | confidence: `DECIMAL(3,2)` |
| `Number` (int32) | `INT` | Millisekunden, Counts | durationMs: `INT` |
| `Number` (int64/long) | `BIGINT` | Große Zahlen | - |
| `Number` (float) | `DOUBLE` | Präzise Fließkommazahlen | temperature: `DOUBLE` |
| `Boolean` | `TINYINT(1)` / `BOOLEAN` | MariaDB Alias für TINYINT(1) | isValid: `BOOLEAN` |
| `Date` | `DATETIME(6)` | 6 = Mikrosekunden-Präzision, **UTC** | createdAt: `DATETIME(6)` |
| `Date` (Timestamp) | `TIMESTAMP(6)` | Auto-Update möglich | updatedAt: `TIMESTAMP(6)` |
| `ObjectId` | `CHAR(24)` | Hex-String Darstellung | _id → `CHAR(24)` |
| `ObjectId` (als FK) | `VARCHAR(255)` | Wenn als Referenz verwendet | userId: `VARCHAR(255)` |
| `Object` (embedded) | `JSON` | Wenn Struktur variabel | intent: `JSON` |
| `Array[String]` | `JSON` / Join-Table | **Join-Table bevorzugt** für Queries | keywords → `keywords` table |
| `Array[Object]` | `JSON` / normalisiert | **Normalisiert bevorzugt** | timings → `JSON` |

### Character Set & Collation
```sql
DEFAULT CHARSET=utf8mb4 
COLLATE=utf8mb4_unicode_ci
```
- **utf8mb4**: Volle Unicode-Unterstützung (Emojis, Sonderzeichen)
- **unicode_ci**: Case-insensitive Vergleiche (wie MongoDB default)

### NULL-Handling
- MongoDB `required: true` → MariaDB `NOT NULL`
- MongoDB `default: X` → MariaDB `DEFAULT X`
- Alle anderen → `NULL` erlaubt

### Index-Strategie
- MongoDB `index: true` → MariaDB `INDEX ix_table__field (field)`
- MongoDB compound index → MariaDB `INDEX ix_table__field1_field2 (field1, field2)`
- Naming: `ix_` prefix für Indices, `uq_` für Unique

---

## Collection-spezifische Mappings

### 1. **transcripts** Collection

| MongoDB Feld | Typ | MariaDB Feld | Typ | Konvertierung | Notes |
|--------------|-----|--------------|-----|---------------|-------|
| `_id` | ObjectId | `id` | `CHAR(36)` | UUID v4 (neu generiert) | Primary Key |
| `userId` | String | `user_id` | `VARCHAR(255)` | Direkt | Index |
| `terminalId` | String | `terminal_id` | `VARCHAR(255)` | Direkt | Index, NULL ok |
| `audioBlobRef` | String | `audio_blob_ref` | `VARCHAR(500)` | Direkt | Pfad/URL |
| `transcript` | String | `transcript` | `TEXT` | Direkt | Kann lang sein |
| `sttConfidence` | Number(0-1) | `stt_confidence` | `DECIMAL(3,2)` | Direkt | NULL ok |
| `aiAdjustedText` | String | `ai_adjusted_text` | `TEXT` | Direkt | NULL ok |
| `suggestions` | Array[String] | → **suggestions** table | - | **Join-Table** | Many-to-Many |
| `suggestionFlag` | Boolean | `suggestion_flag` | `BOOLEAN` | Direkt | DEFAULT false |
| `category` | String | `category` | `VARCHAR(255)` | Direkt | Index, NULL ok |
| `intent` | Object | `intent` | `JSON` | `JSON.stringify()` | NULL ok |
| `isValid` | Boolean | `is_valid` | `BOOLEAN` | Direkt | NOT NULL |
| `confidence` | Number(0-1) | `confidence` | `DECIMAL(3,2)` | Direkt | NULL ok |
| `hasAmbiguity` | Boolean | `has_ambiguity` | `BOOLEAN` | Direkt | DEFAULT false |
| `clarificationNeeded` | Boolean | `clarification_needed` | `BOOLEAN` | Direkt | DEFAULT false |
| `clarificationQuestion` | String | `clarification_question` | `TEXT` | Direkt | NULL ok |
| `durationMs` | Number(int) | `duration_ms` | `INT` | Direkt | NOT NULL |
| `timings` | Object | `timings` | `JSON` | `JSON.stringify()` | NULL ok |
| `model` | String | `model` | `VARCHAR(255)` | Direkt | Index, NOT NULL |
| `llmUrl` | String | `llm_url` | `VARCHAR(500)` | Direkt | NULL ok |
| `llmProvider` | String | `llm_provider` | `VARCHAR(100)` | Direkt | DEFAULT 'lmstudio' |
| `temperature` | Number(float) | `temperature` | `DECIMAL(3,2)` | Direkt | NULL ok |
| `maxTokens` | Number(int) | `max_tokens` | `INT` | Direkt | NULL ok |
| `rawResponse` | Object | `raw_response` | `JSON` | `JSON.stringify()` | NULL ok |
| `error` | String | `error` | `TEXT` | Direkt | NULL ok |
| `fallbackUsed` | Boolean | `fallback_used` | `BOOLEAN` | Direkt | DEFAULT false |
| `assignedAreaId` | String | `assigned_area_id` | `VARCHAR(255)` | Direkt | Index, NULL ok |
| `assignedEntityId` | String | `assigned_entity_id` | `VARCHAR(255)` | Direkt | Index, NULL ok |
| `assignedAction` | Object | `assigned_action` | `JSON` | `JSON.stringify()` | NULL ok |
| `assignedTrigger` | String | `assigned_trigger` | `VARCHAR(255)` | Direkt | NULL ok |
| `assignedTriggerAt` | Date | `assigned_trigger_at` | `DATETIME(6)` | `new Date()` | NULL ok |
| `createdAt` | Date | `created_at` | `DATETIME(6)` | `new Date()` | Index, NOT NULL |
| `updatedAt` | Date | `updated_at` | `DATETIME(6)` | `new Date()` | NOT NULL |

**Spezielle Behandlung:**
- `suggestions` Array wird NICHT in JSON gespeichert, sondern in `transcript_suggestions` Join-Table migriert
- `keywords` (falls vorhanden) → `transcript_keywords` Join-Table

---

### 2. **intentlogs** Collection

| MongoDB Feld | Typ | MariaDB Feld | Typ | Konvertierung | Notes |
|--------------|-----|--------------|-----|---------------|-------|
| `_id` | ObjectId | `id` | `CHAR(36)` | UUID v4 (neu) | Primary Key |
| `timestamp` | String | `timestamp` | `DATETIME(6)` | `new Date(timestamp)` | ⚠️ String→Date |
| `transcript` | String | `transcript` | `TEXT` | Direkt | NOT NULL |
| `intent` | String | `intent_key` | `VARCHAR(255)` | Direkt | Index, NOT NULL |
| `summary` | String | `summary` | `TEXT` | Direkt | NULL ok |
| `keywords` | Array[String] | → **keywords** table | - | **Join-Table** | Many-to-Many |
| `confidence` | Number | `confidence` | `DECIMAL(3,2)` | Direkt | NULL ok |
| `terminalId` | String | `terminal_id` | `VARCHAR(255)` | Direkt | Index, NULL ok |
| `createdAt` | Date | `created_at` | `DATETIME(6)` | `new Date()` | Index, NOT NULL |

**Spezielle Behandlung:**
- `timestamp` Feld ist String in MongoDB → Parsen mit `new Date()`
- `keywords` Array → `intent_log_keywords` Join-Table

---

### 3. **keywords** (neu, Many-to-Many Master)

| Feld | Typ | Konvertierung | Notes |
|------|-----|---------------|-------|
| `id` | `CHAR(36)` | UUID v4 | Primary Key |
| `keyword` | `VARCHAR(100)` | Aus Array extrahiert | UNIQUE, NOT NULL |
| `normalized` | `VARCHAR(100)` | `keyword.toLowerCase().trim()` | Index für Suche |
| `usage_count` | `INT` | Zähler | DEFAULT 0 |
| `created_at` | `TIMESTAMP` | `NOW()` | NOT NULL |

**Deduplizierung:** Case-insensitive via `normalized` Feld

---

### 4. **suggestions** (neu, Many-to-Many Master)

| Feld | Typ | Konvertierung | Notes |
|------|-----|---------------|-------|
| `id` | `CHAR(36)` | UUID v4 | Primary Key |
| `suggestion_text` | `TEXT` | Aus Array extrahiert | NOT NULL |
| `text_hash` | `CHAR(64)` | SHA256 Hash | UNIQUE, Index |
| `usage_count` | `INT` | Zähler | DEFAULT 0 |
| `created_at` | `TIMESTAMP` | `NOW()` | NOT NULL |

**Deduplizierung:** Via SHA256 Hash des Textes

---

## Konvertierungs-Code-Richtlinien

### Date-Handling
```typescript
// MongoDB Date → MariaDB DATETIME
function convertDate(mongoDate: Date | string | null): Date | null {
  if (!mongoDate) return null;
  if (typeof mongoDate === 'string') {
    return new Date(mongoDate);
  }
  return mongoDate;
}
```

### JSON-Handling
```typescript
// MongoDB Object → MariaDB JSON
function convertToJSON(obj: any): string | null {
  if (!obj || typeof obj !== 'object') return null;
  try {
    return JSON.stringify(obj);
  } catch (e) {
    console.error('JSON stringify failed:', e);
    return null;
  }
}
```

### String-Truncation (Sicherheit)
```typescript
// Verhindert Truncation-Fehler
function safeTruncate(str: string | null | undefined, maxLength: number): string | null {
  if (!str) return null;
  if (str.length <= maxLength) return str;
  
  console.warn(`String truncated from ${str.length} to ${maxLength} chars`);
  return str.substring(0, maxLength);
}
```

### Array → Join-Table
```typescript
// Keywords Array → transcript_keywords Join-Table
async function migrateKeywordsArray(
  transcriptId: string,
  keywords: string[],
  connection: Connection
): Promise<void> {
  for (let position = 0; position < keywords.length; position++) {
    const keyword = keywords[position];
    
    // Find or create keyword
    const keywordId = await findOrCreateKeyword(keyword, connection);
    
    // Create join entry
    await connection.query(
      `INSERT INTO transcript_keywords (transcript_id, keyword_id, position, created_at)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE position = VALUES(position)`,
      [transcriptId, keywordId, position]
    );
  }
}
```

---

## Validierungs-Checkliste

Nach der Migration müssen folgende Checks durchgeführt werden:

### ✅ Daten-Integrität
- [ ] Row-Counts stimmen überein: `SELECT COUNT(*) FROM mongo_collection` vs `SELECT COUNT(*) FROM mariadb_table`
- [ ] Keine NULL-Werte wo NOT NULL erwartet: `SELECT COUNT(*) FROM table WHERE required_field IS NULL`
- [ ] Foreign Keys valide: Alle FKs referenzieren existierende PKs
- [ ] Unique Constraints: Keine Duplikate in UNIQUE Feldern

### ✅ Datentyp-Korrektheit
- [ ] Date-Felder im korrekten Format: `SELECT * FROM table WHERE created_at < '1970-01-01'` (sollte leer sein)
- [ ] Confidence-Werte im Range 0-1: `SELECT * FROM table WHERE confidence NOT BETWEEN 0 AND 1`
- [ ] JSON-Felder valide: Teste `JSON_VALID(json_field)` in MariaDB
- [ ] Boolean-Werte 0/1: `SELECT DISTINCT is_valid FROM table` (nur 0,1)

### ✅ Performance
- [ ] Indices angelegt: `SHOW INDEX FROM table`
- [ ] Query-Performance akzeptabel: Teste häufige Queries
- [ ] Join-Performance: Teste Many-to-Many Joins

### ✅ Functional Tests
- [ ] App läuft ohne Fehler gegen MariaDB
- [ ] CRUD-Operationen funktionieren
- [ ] Suche funktioniert (Keywords, Suggestions)
- [ ] Zeitstempel korrekt (Timezone UTC)

---

## Rollback-Plan

Falls Probleme auftreten:

1. **Sofort**: Anwendung auf MongoDB zurückschalten (Env-Variable)
2. **Daten**: MongoDB-Backup wiederherstellen (falls nötig)
3. **MariaDB**: Tabellen truncaten oder droppen: `TRUNCATE TABLE transcripts;`
4. **Analyse**: Logs prüfen, Fehlerursache identifizieren
5. **Fix**: Schema/Migration korrigieren
6. **Retry**: Erneut migrieren auf sauberer DB

---

## Nächste Schritte

1. ✅ Diese Dokumentation reviewen
2. ⏳ Migrationsskript validieren/anpassen (`migrate-keywords-suggestions.ts`)
3. ⏳ Validierungsskript erstellen
4. ⏳ Staging-Migration durchführen
5. ⏳ Production-Migration planen

---

**Status**: 📋 Dokumentation komplett | Migration bereit für Review
**Autor**: GitHub Copilot
**Datum**: 2025-12-05

