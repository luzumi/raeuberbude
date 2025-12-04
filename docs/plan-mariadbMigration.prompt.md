# Plan: MongoDB zu MariaDB Migration

## Übersicht

Migration von MongoDB zu MariaDB mit TypeORM, relationalen Strukturen und vollständiger Datenübernahme.

## Epics / Hauptbereiche

### DBM-EPIC-SCHEMA: Schema-Design & Modellierung
Relationalemodellierung, Normalisierung, TypeORM-Entities

### DBM-EPIC-ORM: ORM-Integration & Repository-Layer
TypeORM-Setup, Repositories, Service-Anpassungen

### DBM-EPIC-DATA: Datenmigration & Transformation
Export, Transformation, Import der Produktionsdaten

### DBM-EPIC-QUERY: Query-Migration & Performance
SQL-Queries, Joins, Aggregationen, Optimierung

### DBM-EPIC-INFRA: Infrastruktur & DevOps
Docker, CI/CD, Umgebungsvariablen, Monitoring

### DBM-EPIC-SECURITY: Security & Best Practices
Parameterisierte Queries, Berechtigungen, Backups

### DBM-EPIC-TEST: Testing & Qualitätssicherung
Unit-Tests, Integrationstests, E2E-Tests aktualisieren

### DBM-EPIC-ROLLOUT: Rollout & Rollback-Strategie
Deployment-Planung, Downtime-Management, Rollback

---

## DBM-EPIC-SCHEMA: Schema-Design & Modellierung

### DBM-SCHEMA-01: Relationales ER-Modell und Normalisierung
**Dauer:** 2 Tage  
**Abhängigkeiten:** Keine  
**Beschreibung:** Erarbeite ein relationales ER-Modell ausgehend vom bestehenden Mongo-Schema. Identifiziere Entitäten, Beziehungen (1:1, 1:n, n:m), normalisiere auf sinnvolles Niveau und dokumentiere Relationstabellen.

### DBM-SCHEMA-02: Schlüssel, Indizes und Constraints definieren
**Dauer:** 1 Tag  
**Abhängigkeiten:** DBM-SCHEMA-01  
**Beschreibung:** Lege Primärschlüssel-Strategie (z.B. UUID), Fremdschlüssel-Relationen, Unique-Constraints und notwendige Indizes fest. Dokumentiere diese als Teil des Schema-Designs.

### DBM-SCHEMA-03: TypeORM-Entities für Kern-Domänenmodelle
**Dauer:** 2 Tage  
**Abhängigkeiten:** DBM-SCHEMA-01, DBM-SCHEMA-02  
**Beschreibung:** Implementiere TypeORM-Entities für die wichtigsten Domänenobjekte (z.B. User, Rollen, Menüs, Items) inkl. Dekoratoren, Relationen und Basisfeldern laut Schema.

### DBM-SCHEMA-04: Join-Tabellen und Many-to-Many-Relationen abbilden
**Dauer:** 1 Tag  
**Abhängigkeiten:** DBM-SCHEMA-01, DBM-SCHEMA-02, DBM-SCHEMA-03  
**Beschreibung:** Implementiere Many-to-Many-Relationen und explizite Join-Tabellen in TypeORM, inkl. zusätzlicher Metadatenfelder, falls im Mongo-Schema vorhanden.

### DBM-SCHEMA-05: Daten-Typen und Konvertierung Mongo→MariaDB festlegen
**Dauer:** 1 Tag  
**Abhängigkeiten:** DBM-SCHEMA-01, DBM-SCHEMA-02  
**Beschreibung:** Definiere Mapping-Regeln von Mongo-Typen (ObjectId, Embedded Documents, Arrays) auf MariaDB-Spalten (UUID, Normalisierung in Tabellen, JSON-Felder falls nötig). Dokumentiere alle Regeln.

### DBM-SCHEMA-06: Initiale TypeORM-Migrationen für Schema erzeugen
**Dauer:** 1 Tag  
**Abhängigkeiten:** DBM-SCHEMA-03, DBM-SCHEMA-04, DBM-SCHEMA-05  
**Beschreibung:** Erzeuge TypeORM-Migrationsdateien für das vollständige Schema (Tabellen, Indizes, Constraints) und stelle sicher, dass ein leerer MariaDB-Stand korrekt aufgebaut werden kann.

### DBM-SCHEMA-07: Schema-Dokumentation und Review
**Dauer:** 1 Tag  
**Abhängigkeiten:** DBM-SCHEMA-06  
**Beschreibung:** Erstelle ausführliche Dokumentation des finalen Schemas (ER-Diagramm, Tabellen-Übersicht, Indizes, Constraints). Führe Code-Review und Schema-Review durch.

---

## DBM-EPIC-ORM: ORM-Integration & Repository-Layer

### DBM-ORM-01: TypeORM in Backend integrieren (Config, Module)
**Dauer:** 1 Tag  
**Abhängigkeiten:** DBM-SCHEMA-06  
**Beschreibung:** Richte TypeORM in NestJS ein: TypeOrmModule.forRoot(), Konfiguration für MariaDB, Environment-Variablen, Connection-Pooling, Logging.

### DBM-ORM-02: Repository-Pattern für alle Entities etablieren
**Dauer:** 2 Tage  
**Abhängigkeiten:** DBM-ORM-01, DBM-SCHEMA-03  
**Beschreibung:** Erstelle Repository-Klassen oder nutze TypeORM-Repositories. Definiere Standard-CRUD-Operationen und Custom-Queries für jede Entity.

### DBM-ORM-03: Service-Layer von Mongo auf TypeORM umstellen
**Dauer:** 3 Tage  
**Abhängigkeiten:** DBM-ORM-02  
**Beschreibung:** Ersetze Mongo-Aufrufe in Services durch TypeORM-Repositories. Passe Datenfluss, Rückgabewerte und Error-Handling an.

### DBM-ORM-04: DTOs und Validierung überarbeiten
**Dauer:** 1 Tag  
**Abhängigkeiten:** DBM-ORM-03  
**Beschreibung:** Überprüfe und aktualisiere alle DTOs (Data Transfer Objects) und Validierungsregeln (class-validator), um neue Entitäts-Strukturen zu reflektieren.

### DBM-ORM-05: Transaktions-Management implementieren
**Dauer:** 1 Tag  
**Abhängigkeiten:** DBM-ORM-02, DBM-ORM-03  
**Beschreibung:** Nutze TypeORM-Transaktionen (@Transaction, QueryRunner) für zusammenhängende Änderungen. Identifiziere kritische Geschäftslogik und sichere sie mit Transaktionen ab.

### DBM-ORM-06: Fehlerbehandlung und Logging anpassen
**Dauer:** 1 Tag  
**Abhängigkeiten:** DBM-ORM-03  
**Beschreibung:** Passe Fehlerbehandlung an relationale Constraints (FK-Violations, Unique-Violations). Erweitere Logging für SQL-Queries und Transaktionen.

---

## DBM-EPIC-DATA: Datenmigration & Transformation

### DBM-DATA-01: Export-Skript für MongoDB-Daten erstellen
**Dauer:** 1 Tag  
**Abhängigkeiten:** DBM-SCHEMA-05  
**Beschreibung:** Implementiere ein Node.js-Skript zum Export aller relevanten MongoDB-Collections als JSON oder CSV, inkl. Fehlerbehandlung und Progress-Logging.

### DBM-DATA-02: Transformations-Skript Mongo→MariaDB entwickeln
**Dauer:** 3 Tage  
**Abhängigkeiten:** DBM-DATA-01, DBM-SCHEMA-05  
**Beschreibung:** Entwickle ein Skript, das Mongo-Daten transformiert: ObjectId→UUID, Embedded→Relationen, Arrays→Join-Tabellen, Daten-Normalisierung.

### DBM-DATA-03: Batch-Import-Skript für MariaDB erstellen
**Dauer:** 2 Tage  
**Abhängigkeiten:** DBM-DATA-02, DBM-ORM-01  
**Beschreibung:** Implementiere Batch-Insert-Logik mit TypeORM oder raw SQL für effiziente Massendatenimporte. Nutze Transaktionen und Chunking.

### DBM-DATA-04: Validierungs- und Integritätsprüfung nach Import
**Dauer:** 1 Tag  
**Abhängigkeiten:** DBM-DATA-03  
**Beschreibung:** Entwickle Skripte zur Validierung: Zähle Datensätze, prüfe Fremdschlüssel-Integrität, vergleiche Stichproben Mongo vs. MariaDB.

### DBM-DATA-05: Rollback- und Re-Import-Strategie testen
**Dauer:** 1 Tag  
**Abhängigkeiten:** DBM-DATA-03, DBM-DATA-04  
**Beschreibung:** Teste Rollback-Szenarien: Leere MariaDB, Re-Import, Idempotenz. Dokumentiere Rollback-Prozedur für Produktionsumgebung.

### DBM-DATA-06: Migrations-Skripte dokumentieren und reviewen
**Dauer:** 1 Tag  
**Abhängigkeiten:** DBM-DATA-05  
**Beschreibung:** Erstelle ausführliche Dokumentation für alle Migrations-Skripte, inkl. Parameter, Laufzeit, Voraussetzungen. Code-Review durchführen.

---

## DBM-EPIC-QUERY: Query-Migration & Performance

### DBM-QUERY-01: Aggregationspipelines auf SQL umstellen
**Dauer:** 2 Tage  
**Abhängigkeiten:** DBM-ORM-03  
**Beschreibung:** Identifiziere alle Mongo-Aggregationspipelines im Code. Ersetze sie durch SQL-Queries mit JOINs, GROUP BY, Subqueries. Nutze TypeORM QueryBuilder.

### DBM-QUERY-02: Such- und Filterlogik auf SQL migrieren
**Dauer:** 2 Tage  
**Abhängigkeiten:** DBM-ORM-03  
**Beschreibung:** Stelle Mongo-Find-Queries mit komplexen Filtern auf WHERE-Klauseln und TypeORM-Filtering um. Achte auf korrekte SQL-Syntax und Typen.

### DBM-QUERY-03: Pagination und Sortierung optimieren
**Dauer:** 1 Tag  
**Abhängigkeiten:** DBM-QUERY-02  
**Beschreibung:** Implementiere Pagination (LIMIT/OFFSET oder Cursor-based) und Sortierung mit TypeORM. Optimiere Performance mit Indizes.

### DBM-QUERY-04: Performance-Tests und EXPLAIN-Analyse
**Dauer:** 2 Tage  
**Abhängigkeiten:** DBM-QUERY-01, DBM-QUERY-02, DBM-QUERY-03  
**Beschreibung:** Führe Performance-Tests mit realistischen Datenmengen durch. Nutze EXPLAIN für langsame Queries, identifiziere fehlende Indizes.

### DBM-QUERY-05: Query-Optimierung und Index-Tuning
**Dauer:** 2 Tage  
**Abhängigkeiten:** DBM-QUERY-04  
**Beschreibung:** Optimiere identifizierte Probleme: Füge Indizes hinzu, refaktoriere Queries, nutze Covering Indexes, denormalisiere falls sinnvoll.

### DBM-QUERY-06: Caching-Strategie für häufige Queries
**Dauer:** 1 Tag  
**Abhängigkeiten:** DBM-QUERY-05  
**Beschreibung:** Implementiere Caching-Layer (z.B. Redis) für häufige Read-Queries. Definiere Cache-Invalidation-Strategie.

---

## DBM-EPIC-INFRA: Infrastruktur & DevOps

### DBM-INFRA-01: MariaDB Docker-Setup für Development
**Dauer:** 1 Tag  
**Abhängigkeiten:** Keine  
**Beschreibung:** Erstelle docker-compose.yml für MariaDB in Dev-Umgebung. Konfiguriere Volumes, Environment-Variablen, Healthchecks.

### DBM-INFRA-02: MariaDB-Konfiguration optimieren
**Dauer:** 1 Tag  
**Abhängigkeiten:** DBM-INFRA-01  
**Beschreibung:** Konfigure MariaDB für optimale Performance: InnoDB-Buffer-Pool, Connection-Limit, Query-Cache, Slow-Query-Log.

### DBM-INFRA-03: CI/CD-Pipeline für Migrations anpassen
**Dauer:** 2 Tage  
**Abhängigkeiten:** DBM-SCHEMA-06, DBM-INFRA-01  
**Beschreibung:** Integriere TypeORM-Migrations in CI/CD: Automatisches Ausführen bei Deployment, Rollback-Support, Migration-Status-Checks.

### DBM-INFRA-04: Umgebungsvariablen und Secrets-Management
**Dauer:** 1 Tag  
**Abhängigkeiten:** DBM-INFRA-01  
**Beschreibung:** Konfiguriere alle DB-Connection-Strings als Environment-Variablen. Nutze Secrets-Management (z.B. .env.vault, AWS Secrets Manager) für Produktions-Credentials.

### DBM-INFRA-05: Monitoring und Alerting für MariaDB
**Dauer:** 1 Tag  
**Abhängigkeiten:** DBM-INFRA-02  
**Beschreibung:** Richte Monitoring ein: Connection-Pool-Status, Query-Performance, Disk-Space, Slow-Queries. Konfiguriere Alerts.

### DBM-INFRA-06: Staging-Umgebung mit MariaDB aufsetzen
**Dauer:** 1 Tag  
**Abhängigkeiten:** DBM-INFRA-03, DBM-INFRA-04  
**Beschreibung:** Erstelle Staging-Umgebung mit MariaDB. Führe ersten Test-Deployment durch. Validiere Migrations-Workflow.

---

## DBM-EPIC-SECURITY: Security & Best Practices

### DBM-SEC-01: Parameterisierte Queries sicherstellen
**Dauer:** 1 Tag  
**Abhängigkeiten:** DBM-ORM-03  
**Beschreibung:** Auditiere alle SQL-Queries. Stelle sicher, dass nur parameterisierte Queries (TypeORM) verwendet werden. Eliminiere String-Concatenation.

### DBM-SEC-02: Least-Privilege DB-User einrichten
**Dauer:** 1 Tag  
**Abhängigkeiten:** DBM-INFRA-01  
**Beschreibung:** Erstelle separate DB-User mit minimalen Rechten: App-User (SELECT, INSERT, UPDATE, DELETE), Migration-User (DDL), Readonly-User (Reports).

### DBM-SEC-03: Connection-String-Verschlüsselung
**Dauer:** 0.5 Tage  
**Abhängigkeiten:** DBM-INFRA-04  
**Beschreibung:** Verschlüssele alle DB-Connection-Strings. Nutze Secrets-Manager oder verschlüsselte .env-Dateien. Keine Plaintext-Passwords im Code.

### DBM-SEC-04: Backup-Strategie implementieren
**Dauer:** 1 Tag  
**Abhängigkeiten:** DBM-INFRA-02  
**Beschreibung:** Richte automatische Backups ein: Daily Full Backup, Incremental Backups, Point-in-Time-Recovery. Teste Restore-Prozedur.

### DBM-SEC-05: SQL-Injection-Tests durchführen
**Dauer:** 1 Tag  
**Abhängigkeiten:** DBM-SEC-01  
**Beschreibung:** Führe SQL-Injection-Tests durch (automatisiert und manuell). Nutze Tools wie sqlmap. Dokumentiere Findings und Fixes.

### DBM-SEC-06: Security-Audit und Penetration-Test
**Dauer:** 2 Tage  
**Abhängigkeiten:** DBM-SEC-01, DBM-SEC-02, DBM-SEC-05  
**Beschreibung:** Führe umfassendes Security-Audit durch: DB-Konfiguration, Netzwerk-Isolation, Verschlüsselung at Rest/in Transit.

---

## DBM-EPIC-TEST: Testing & Qualitätssicherung

### DBM-TEST-01: Unit-Tests für Repositories schreiben
**Dauer:** 2 Tage  
**Abhängigkeiten:** DBM-ORM-02  
**Beschreibung:** Schreibe Unit-Tests für alle Repository-Methoden. Nutze In-Memory-DB oder Testcontainers für isolierte Tests.

### DBM-TEST-02: Integrationstests für Service-Layer aktualisieren
**Dauer:** 2 Tage  
**Abhängigkeiten:** DBM-ORM-03, DBM-TEST-01  
**Beschreibung:** Aktualisiere bestehende Integrationstests auf MariaDB. Stelle sicher, dass alle Services mit TypeORM korrekt funktionieren.

### DBM-TEST-03: E2E-Tests für kritische User-Flows
**Dauer:** 2 Tage  
**Abhängigkeiten:** DBM-TEST-02  
**Beschreibung:** Führe E2E-Tests für kritische Flows aus (Login, CRUD-Operationen, komplexe Geschäftslogik). Nutze Playwright/Cypress.

### DBM-TEST-04: Performance-Tests und Load-Tests
**Dauer:** 2 Tage  
**Abhängigkeiten:** DBM-QUERY-05  
**Beschreibung:** Führe Performance-Tests durch: Response-Zeiten, Throughput, Concurrent-Users. Nutze Tools wie k6, Artillery oder JMeter.

### DBM-TEST-05: Daten-Integritätstests
**Dauer:** 1 Tag  
**Abhängigkeiten:** DBM-DATA-04  
**Beschreibung:** Teste Datenintegrität: Foreign-Key-Constraints, Unique-Constraints, Check-Constraints. Validiere Geschäftsregeln auf DB-Ebene.

### DBM-TEST-06: Test-Dokumentation und Coverage-Report
**Dauer:** 1 Tag  
**Abhängigkeiten:** DBM-TEST-01, DBM-TEST-02, DBM-TEST-03  
**Beschreibung:** Erstelle Test-Dokumentation. Generiere Coverage-Reports. Stelle sicher, dass Critical-Path-Code >80% Coverage hat.

---

## DBM-EPIC-ROLLOUT: Rollout & Rollback-Strategie

### DBM-ROLLOUT-01: Rollout-Plan erstellen
**Dauer:** 1 Tag  
**Abhängigkeiten:** DBM-DATA-06, DBM-INFRA-06  
**Beschreibung:** Erstelle detaillierten Rollout-Plan: Zeitfenster, Downtime-Dauer, Kommunikation, Rollback-Trigger, Verantwortlichkeiten.

### DBM-ROLLOUT-02: Downtime-Management und Wartungsmodus
**Dauer:** 1 Tag  
**Abhängigkeiten:** DBM-ROLLOUT-01  
**Beschreibung:** Implementiere Wartungsmodus-Seite. Plane Kommunikation mit Usern. Definiere Downtime-Fenster (z.B. nachts, Wochenende).

### DBM-ROLLOUT-03: Dual-Write-Strategie (optional)
**Dauer:** 3 Tage  
**Abhängigkeiten:** DBM-ORM-03  
**Beschreibung:** Falls Zero-Downtime erforderlich: Implementiere Dual-Write (parallel zu Mongo und MariaDB schreiben). Komplexer, ermöglicht aber graduelle Migration.

### DBM-ROLLOUT-04: Smoke-Tests und Health-Checks
**Dauer:** 1 Tag  
**Abhängigkeiten:** DBM-ROLLOUT-02  
**Beschreibung:** Entwickle Smoke-Tests für Post-Deployment-Validierung: DB-Connection, kritische Endpoints, Datenintegrität. Automatisiere Health-Checks.

### DBM-ROLLOUT-05: Rollback-Prozedur dokumentieren und testen
**Dauer:** 1 Tag  
**Abhängigkeiten:** DBM-DATA-05, DBM-ROLLOUT-01  
**Beschreibung:** Dokumentiere detaillierte Rollback-Prozedur: DB-Restore aus Backup, Code-Rollback, Re-Deployment. Teste Rollback in Staging.

### DBM-ROLLOUT-06: Produktions-Deployment und Monitoring
**Dauer:** 1 Tag  
**Abhängigkeiten:** DBM-ROLLOUT-04, DBM-ROLLOUT-05, DBM-SEC-06, DBM-TEST-06  
**Beschreibung:** Führe Produktions-Deployment durch. Überwache System intensiv in ersten 24h. Führe Smoke-Tests aus. Dokumentiere Lessons-Learned.

---

## Zeitplan-Übersicht

**Gesamtdauer:** ca. 58 Arbeitstage (ca. 12 Wochen bei 1 Person)

- **DBM-EPIC-SCHEMA:** 9 Tage
- **DBM-EPIC-ORM:** 9 Tage
- **DBM-EPIC-DATA:** 9 Tage
- **DBM-EPIC-QUERY:** 10 Tage
- **DBM-EPIC-INFRA:** 7 Tage
- **DBM-EPIC-SECURITY:** 6.5 Tage
- **DBM-EPIC-TEST:** 10 Tage
- **DBM-EPIC-ROLLOUT:** 8 Tage

**Kritischer Pfad:**
DBM-SCHEMA-01 → DBM-SCHEMA-02 → DBM-SCHEMA-03 → DBM-SCHEMA-06 → DBM-ORM-01 → DBM-ORM-02 → DBM-ORM-03 → DBM-DATA-02 → DBM-DATA-03 → DBM-ROLLOUT-06

---

## Risiken & Mitigation

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| Datenverlust bei Migration | Mittel | Kritisch | Umfangreiche Backups, Test-Imports in Staging, Rollback-Plan |
| Performance-Probleme | Hoch | Hoch | Frühzeitige Performance-Tests, Index-Optimierung, Caching |
| Schema-Änderungen während Migration | Mittel | Hoch | Feature-Freeze während Migration, klare Versionierung |
| Unerwartete Downtime | Niedrig | Kritisch | Buffer in Zeitplanung, 24/7-Support während Rollout |
| Unvollständige Datentransformation | Mittel | Hoch | Umfangreiche Validierung, Stichproben-Vergleiche |

---

## Nächste Schritte

1. **Plan reviewen und priorisieren**
2. **YouTrack-Tickets erstellen** (mit youtrack-import.html)
3. **Team-Ressourcen zuweisen**
4. **Kick-off-Meeting planen**
5. **Mit DBM-SCHEMA-01 starten**

