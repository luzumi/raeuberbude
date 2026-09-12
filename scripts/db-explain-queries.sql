-- ============================================================================
-- EXPLAIN ANALYZE für kritische Queries
-- ============================================================================
--
-- Zweck: Validierung der Index-Nutzung für alle kritischen Query-Patterns
--
-- Usage:
--   mysql -u rb_user -p raueberbude < scripts/db-explain-queries.sql
--
-- Erwartung: Alle Queries sollten Indizes nutzen (type != ALL)
-- ============================================================================

USE raueberbude;

SET @test_user_id = (SELECT id FROM users LIMIT 1);
SET @test_terminal_id = (SELECT id FROM app_terminals LIMIT 1);
SET @test_entity_id = (SELECT entity_id FROM ha_entities LIMIT 1);
SET @test_snapshot_id = (SELECT id FROM ha_snapshots ORDER BY created_at DESC LIMIT 1);

-- ============================================================================
-- 1. AUTH & PERMISSIONS QUERIES
-- ============================================================================

SELECT '\n=== 1.1 User Login by Username ===' as '';
EXPLAIN FORMAT=JSON
SELECT * FROM users WHERE username = 'admin';

SELECT '\n=== 1.2 User Permissions Lookup ===' as '';
EXPLAIN FORMAT=JSON
SELECT ur.* FROM user_rights ur WHERE ur.user_id = @test_user_id;

SELECT '\n=== 1.3 Allowed Terminals for User ===' as '';
EXPLAIN FORMAT=JSON
SELECT t.*
FROM app_terminals t
  JOIN user_allowed_terminals uat ON t.id = uat.terminal_id
WHERE uat.user_id = @test_user_id;

-- Expected: Index usage on username (UNIQUE), user_id (FK), composite (user_id, terminal_id)

-- ============================================================================
-- 2. SPEECH-TO-TEXT PIPELINE QUERIES
-- ============================================================================

SELECT '\n=== 2.1 Recent Transcripts for User ===' as '';
EXPLAIN FORMAT=JSON
SELECT * FROM speech_transcripts
WHERE user_id = @test_user_id
ORDER BY created_at DESC
LIMIT 50;

SELECT '\n=== 2.2 Transcripts by Category ===' as '';
EXPLAIN FORMAT=JSON
SELECT * FROM speech_transcripts
WHERE category = 'home_control'
  AND created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
ORDER BY created_at DESC;

SELECT '\n=== 2.3 Intent Statistics ===' as '';
EXPLAIN FORMAT=JSON
SELECT intent_key, COUNT(*) as count
FROM intent_logs
WHERE created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY intent_key
ORDER BY count DESC;

SELECT '\n=== 2.4 Keyword Ranking ===' as '';
EXPLAIN FORMAT=JSON
SELECT k.keyword, COUNT(tk.keyword_id) as usage
FROM keywords k
  JOIN transcript_keywords tk ON k.id = tk.keyword_id
GROUP BY k.id
ORDER BY usage DESC
LIMIT 20;

SELECT '\n=== 2.5 Transcripts with Keyword ===' as '';
EXPLAIN FORMAT=JSON
SELECT t.*
FROM speech_transcripts t
  JOIN transcript_keywords tk ON t.id = tk.transcript_id
  JOIN keywords k ON tk.keyword_id = k.id
WHERE k.keyword = 'licht'
ORDER BY t.created_at DESC
LIMIT 50;

-- Expected: Composite index on (user_id, created_at), index on category, intent_key, keyword

-- ============================================================================
-- 3. HOMEASSISTANT QUERIES
-- ============================================================================

SELECT '\n=== 3.1 Entity Lookup by ID ===' as '';
EXPLAIN FORMAT=JSON
SELECT * FROM ha_entities WHERE entity_id = @test_entity_id;

SELECT '\n=== 3.2 Entities in Area ===' as '';
EXPLAIN FORMAT=JSON
SELECT * FROM ha_entities
WHERE area_id = (SELECT area_id FROM ha_areas LIMIT 1);

SELECT '\n=== 3.3 Current Entity State ===' as '';
EXPLAIN FORMAT=JSON
SELECT es.*
FROM ha_entity_states es
  JOIN ha_snapshots s ON es.snapshot_id = s.id
WHERE es.entity_id = @test_entity_id
ORDER BY s.created_at DESC
LIMIT 1;

SELECT '\n=== 3.4 Entity State History ===' as '';
EXPLAIN FORMAT=JSON
SELECT es.state, es.last_changed, s.created_at as snapshot_time
FROM ha_entity_states es
  JOIN ha_snapshots s ON es.snapshot_id = s.id
WHERE es.entity_id = @test_entity_id
ORDER BY s.created_at DESC
LIMIT 100;

SELECT '\n=== 3.5 Entity Attributes for State ===' as '';
EXPLAIN FORMAT=JSON
SELECT * FROM ha_entity_attributes
WHERE state_id = (SELECT id FROM ha_entity_states LIMIT 1);

-- Expected: PK index on entity_id, composite index on (entity_id, snapshot_id)

-- ============================================================================
-- 4. LOGGING & AUDITING QUERIES
-- ============================================================================

SELECT '\n=== 4.1 Recent Error Logs ===' as '';
EXPLAIN FORMAT=JSON
SELECT * FROM event_logs
WHERE level = 'error'
  AND created_at > DATE_SUB(NOW(), INTERVAL 1 DAY)
ORDER BY created_at DESC;

SELECT '\n=== 4.2 User Activity Timeline ===' as '';
EXPLAIN FORMAT=JSON
SELECT DATE(created_at) as date, COUNT(*) as actions
FROM intent_logs
WHERE user_id = @test_user_id
GROUP BY date
ORDER BY date DESC
LIMIT 30;

SELECT '\n=== 4.3 Terminal Activity ===' as '';
EXPLAIN FORMAT=JSON
SELECT * FROM intent_logs
WHERE terminal_id = @test_terminal_id
  AND created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
ORDER BY created_at DESC;

-- Expected: Index on level, created_at, composite (user_id, created_at), terminal_id

-- ============================================================================
-- 5. COMPLEX JOIN QUERIES
-- ============================================================================

SELECT '\n=== 5.1 Full Transcript with Relations ===' as '';
EXPLAIN FORMAT=JSON
SELECT
  t.*,
  u.username,
  term.name as terminal_name,
  GROUP_CONCAT(k.keyword) as keywords
FROM speech_transcripts t
  LEFT JOIN users u ON t.user_id = u.id
  LEFT JOIN app_terminals term ON t.terminal_id = term.id
  LEFT JOIN transcript_keywords tk ON t.id = tk.transcript_id
  LEFT JOIN keywords k ON tk.keyword_id = k.id
WHERE t.user_id = @test_user_id
GROUP BY t.id
ORDER BY t.created_at DESC
LIMIT 10;

SELECT '\n=== 5.2 Entity with Latest State and Attributes ===' as '';
EXPLAIN FORMAT=JSON
SELECT
  e.*,
  es.state,
  es.last_changed,
  GROUP_CONCAT(CONCAT(ea.key, ':', ea.value)) as attributes
FROM ha_entities e
  LEFT JOIN ha_entity_states es ON e.entity_id = es.entity_id
  LEFT JOIN ha_snapshots s ON es.snapshot_id = s.id
  LEFT JOIN ha_entity_attributes ea ON es.id = ea.state_id
WHERE e.entity_id = @test_entity_id
  AND s.id = @test_snapshot_id
GROUP BY e.entity_id;

-- Expected: Efficient use of FK indexes, no table scans

-- ============================================================================
-- 6. AGGREGATE QUERIES (Performance-kritisch)
-- ============================================================================

SELECT '\n=== 6.1 Daily Transcript Volume ===' as '';
EXPLAIN FORMAT=JSON
SELECT
  DATE(created_at) as date,
  COUNT(*) as count,
  AVG(confidence) as avg_confidence,
  COUNT(DISTINCT user_id) as unique_users
FROM speech_transcripts
WHERE created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY date
ORDER BY date DESC;

SELECT '\n=== 6.2 Intent Distribution by Terminal ===' as '';
EXPLAIN FORMAT=JSON
SELECT
  t.name as terminal,
  il.intent_key,
  COUNT(*) as count
FROM intent_logs il
  JOIN app_terminals t ON il.terminal_id = t.id
WHERE il.created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY t.id, il.intent_key
ORDER BY count DESC
LIMIT 50;

-- Expected: Index on created_at for range scans

-- ============================================================================
-- 7. SLOW QUERY PATTERNS (Potenzielle Probleme)
-- ============================================================================

SELECT '\n=== 7.1 Full-Text Search in Transcript (SLOW - Expected) ===' as '';
EXPLAIN FORMAT=JSON
SELECT * FROM speech_transcripts
WHERE transcript LIKE '%Wohnzimmer%'
LIMIT 50;
-- ⚠️ Expected: Table scan (kein FULLTEXT-Index)

SELECT '\n=== 7.2 JSON Field Query (SLOW - Expected) ===' as '';
EXPLAIN FORMAT=JSON
SELECT * FROM speech_transcripts
WHERE JSON_EXTRACT(intent, '$.action') = 'turn_on'
LIMIT 50;
-- ⚠️ Expected: Table scan (keine JSON-Indizes)

SELECT '\n=== 7.3 Large Offset Pagination (SLOW - Expected) ===' as '';
EXPLAIN FORMAT=JSON
SELECT * FROM speech_transcripts
ORDER BY created_at DESC
LIMIT 10000, 50;
-- ⚠️ Expected: Langsam bei großen Offsets

-- ============================================================================
-- SUMMARY: Index Usage Check
-- ============================================================================

SELECT '\n=== INDEX USAGE SUMMARY ===' as '';

SELECT
  table_name,
  index_name,
  seq_in_index,
  column_name,
  cardinality,
  index_type
FROM information_schema.statistics
WHERE table_schema = 'raueberbude'
  AND table_name IN (
    'users', 'user_rights', 'app_terminals', 'terminal_rights',
    'speech_transcripts', 'intent_logs', 'event_logs',
    'keywords', 'transcript_keywords', 'intent_log_keywords',
    'ha_entities', 'ha_areas', 'ha_devices', 'ha_snapshots',
    'ha_entity_states', 'ha_entity_attributes'
  )
ORDER BY table_name, index_name, seq_in_index;

-- ============================================================================
-- Validation Queries
-- ============================================================================

SELECT '\n=== MISSING INDEXES CHECK ===' as '';

-- Check for foreign keys without indexes
SELECT
  CONCAT(table_name, '.', column_name) as foreign_key,
  referenced_table_name,
  'Missing index?' as status
FROM information_schema.key_column_usage
WHERE table_schema = 'raueberbude'
  AND referenced_table_name IS NOT NULL
  AND CONCAT(table_name, '.', column_name) NOT IN (
    SELECT CONCAT(table_name, '.', column_name)
    FROM information_schema.statistics
    WHERE table_schema = 'raueberbude'
  );

SELECT '\n=== DUPLICATE INDEXES CHECK ===' as '';

-- Check for redundant indexes
SELECT
  table_name,
  GROUP_CONCAT(index_name) as duplicate_indexes,
  GROUP_CONCAT(column_name) as columns
FROM information_schema.statistics
WHERE table_schema = 'raueberbude'
GROUP BY table_name, column_name
HAVING COUNT(DISTINCT index_name) > 2;

-- ============================================================================
-- END OF EXPLAIN QUERIES
-- ============================================================================

SELECT '\n=== ✅ EXPLAIN ANALYZE COMPLETE ===' as '';
SELECT '    Review the output above for:' as '';
SELECT '    - type != "ALL" (no full table scans)' as '';
SELECT '    - key != NULL (index is used)' as '';
SELECT '    - rows < 1000 (efficient index usage)' as '';
SELECT '    - Extra != "Using filesort" (for ORDER BY)' as '';

