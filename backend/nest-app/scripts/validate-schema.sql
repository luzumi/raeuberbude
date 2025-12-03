-- Prüfe alle Tabellen
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Prüfe Constraints für users
SELECT
  con.conname AS constraint_name,
  CASE con.contype
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'u' THEN 'UNIQUE'
    WHEN 'f' THEN 'FOREIGN KEY'
    WHEN 'c' THEN 'CHECK'
  END AS constraint_type
FROM pg_constraint con
JOIN pg_class rel ON con.conrelid = rel.oid
WHERE rel.relname = 'users'
ORDER BY constraint_type, constraint_name;

-- Prüfe Constraints für user_rights
SELECT
  con.conname AS constraint_name,
  CASE con.contype
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'u' THEN 'UNIQUE'
    WHEN 'f' THEN 'FOREIGN KEY'
    WHEN 'c' THEN 'CHECK'
  END AS constraint_type
FROM pg_constraint con
JOIN pg_class rel ON con.conrelid = rel.oid
WHERE rel.relname = 'user_rights'
ORDER BY constraint_type, constraint_name;

-- Prüfe alle Foreign Keys
SELECT
  con.conname AS fk_name,
  rel.relname AS from_table,
  att.attname AS from_column,
  ref_rel.relname AS to_table
FROM pg_constraint con
JOIN pg_class rel ON con.conrelid = rel.oid
JOIN pg_attribute att ON att.attnum = ANY(con.conkey) AND att.attrelid = con.conrelid
JOIN pg_class ref_rel ON con.confrelid = ref_rel.oid
WHERE con.contype = 'f'
  AND rel.relname IN ('users', 'user_rights', 'app_terminals', 'ha_devices', 'ha_entities')
ORDER BY from_table, fk_name;

