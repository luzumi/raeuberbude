Ticket: LUD28-112 — LUD28-59.7 Deployment Integration — Staging Deployment Smoke Tests
=====================================================================================

Kurzfassung
-----------
Ziel dieses Tickets war die Migration und Verifikation von Daten aus MongoDB nach MariaDB sowie das Aufräumen temporärer Migration-/Debug-Artefakte im Repository.

Was ich gemacht habe
--------------------
- HomeAssistant-Snapshot importiert (CLI `import:ha`) — Import schlug an und lieferte Statistiken.
- HA-Entitäten in MariaDB befüllt: Hilfs-Skript `fill_ha_entities_from_mongo.js` (aus `scripts/ha/`) hat 343 Entitäten in `ha_entities` geschrieben (Verifikation während der Arbeit).
- Migration weiterer Collections durchgeführt/validiert (transcripts, intent_logs, users, categories, llm_instances).
- Temporäre Debug-/Testskripte archiviert und thematisch sortiert:
  - Archiv (Original-Inhalte): `backend/nest-app/scripts/archive/original-scripts.json`
  - Thematische Ordner mit wiederhergestellten/geordneten Skripten:
    - `backend/nest-app/scripts/ha/` (HA-spezifische Hilfen)
    - `backend/nest-app/scripts/migration/` (große Migrationen)
    - `backend/nest-app/scripts/tools/` (Hilfswerkzeuge)
    - `backend/nest-app/scripts/debug/` (Stubs / Hinweise)
    - `backend/nest-app/scripts/tests/` (kleine Testskripte)
  - Top-Level-`scripts/`-Dateien, die zuvor temporär waren, wurden durch kurze Stubs ersetzt, die auf die neuen Pfade verweisen.
- Kleines Hilfs-Skript zum schnellen Überprüfen der HA-Anzahl erstellt: `backend/nest-app/scripts/check_ha_count.js`.

Verifikation
------------
- Während der Migration wurde geprüft, dass `ha_entities` in MariaDB befüllt wurde (import + helper fill). Der gezählte Wert betrug 343 Einträge (Snapshot). Du kannst das jederzeit nachprüfen mit:

```bash
cd backend/nest-app
node scripts/check_ha_count.js
```

Aufräum-/Safety-Notizen
-----------------------
- Alle archivierten Originalskripte sind in `scripts/archive/original-scripts.json` gesichert — bei Bedarf stelle ich sie wieder her oder entpacke sie in einzelne Dateien.
- Produktive Migrationsskripte sind nicht gelöscht, sondern in `scripts/migration/` einsortiert.
- Ich habe keine Produktivdaten verändert außer der Migration/Import, die bereits zuvor durchgeführt wurde.

Empfehlungen / nächste Schritte
-------------------------------
- Optional: Automatisiere die HA→MariaDB-Füllung beim Import (z. B. npm-Skript `import:ha:full` oder Flag `--flush-to-mariadb`), damit beim App-Start kein manueller Schritt nötig ist.
- Optional: Entpacken des Archiv-JSON in einzelne Dateien für einfachere Review/PR.

Status & Vorschlag zum Schließen
--------------------------------
- Status: Datenübertragung abgeschlossen; Arbeitsbereich bereinigt.
- Vorschlag: Ticket kann geschlossen werden. Falls du möchtest, übernehme ich noch die Automatisierung (siehe Empfehlungen) bevor wir endgültig schließen.

Details / Logs
--------------
- Relevante Dateien / Pfade:
  - `backend/nest-app/scripts/ha/fill_ha_entities_from_mongo.js` (HA-Fill-Skript)
  - `backend/nest-app/scripts/ha/migrate_ha_entities.js` (HA-Migration Upsert)
  - `backend/nest-app/scripts/migration/migrate_mongo_to_maria.js` (Haupt-Migration)
  - `backend/nest-app/scripts/migration/import_all_collections_to_mariadb.js`
  - `backend/nest-app/scripts/archive/original-scripts.json` (Archivierte Originals)
  - `backend/nest-app/scripts/check_ha_count.js` (schnelle Verifikation)

Wenn gewünscht, poste ich diesen Text als Kommentar in YouTrack oder formatiere ihn für das Ticket (z. B. als abschließenden Kommentar).
