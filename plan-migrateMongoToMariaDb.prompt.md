Wichtigste Punkte kurz und prägnant:

1. Wähle ein ORM (Prisma, TypeORM, Sequelize). Prisma = modern, type-safe; TypeORM = Decorators, eng integriert in TS/Node.
2. Schema-Design: normalisieren, Fremdschlüssel, many-to-many über Join-Tabellen, Indizes, Unique-Constraints.
3. Daten-Typen: Mongo ObjectId → UUID oder numeric id; Arrays/embedded → separate Tabellen/Relations.
4. Migration: Daten exportieren/transformieren, Batch-Insert, evtl. Downtime oder Dual-Write. Test-Rollback planen.
5. Transaktionen: für zusammenhängende Änderungen nutzen.
6. Queries: Aggregationspipeline → SQL Joins / GROUP BY / Fensterfunktionen.
7. Performance: Indizes, Query-Optimierung, Connection-Pooling, EXPLAIN.
8. Infrastruktur: MariaDB in Dev (Docker), CI/CD Migrations, Umgebungsvariablen.
9. Security: Parameterisierte Queries, least-privilege DB-User, Backups.
10. Codeänderungen: Repositories/Services anpassen, DTOs, Validierung, Tests aktualisieren, API-Payloads prüfen.

Kurz: plane Schema, Migration und Tests genau, wähle ORM und Migrations-Tool, und migriere datentransformierend mit Backups und Transaktionen.

Ich erstelle einen Umsetzungsplan für die Migration von MongoDB zu MariaDB mit TypeORM und eine Aufteilung in YouTrack-Tickets — zuerst liefere ich die Arbeitspakete zur Prüfung.

Checklist (zu bestätigen)
- [x] Epics in YouTrack anlegen: DB-Migration, Infra, Daten-Migration, App-Änderungen, Tests, Rollout
- [x] Schema-Design & Entity-Definitionen (`src/entity/*`)
- [x] Migrationsskripte & Transformations-Tools (`scripts/migrate-from-mongo.ts`)
- [x] Dev- und CI-Infrastruktur (`backend/docker-compose.yml`, CI-Pipeline)
- [x] Repositories/Services & DTOs anpassen (`src/services/*`, `src/repos/*`)
- [x] Tests, Backups, Rollback-Plan, Monitoring

## Plan: YouTrack-Backlog für Mongo→Maria mit TypeORM

Dieser Plan strukturiert die Migration von MongoDB zu MariaDB mit TypeORM in YouTrack-taugliche Epics und Tickets. Die Platzhalter-Keys (z.B. `DBM-SCHEMA-01`) dienen nur als Referenzen für Abhängigkeiten und Reihenfolge; reale IDs werden später in YouTrack vergeben.

---

## Epic: DBM-EPIC-SCHEMA – Schema & Entities

### DBM-SCHEMA-01 – Relationales ER-Modell und Normalisierung
**Beschreibung:**  
Erarbeite ein relationales ER-Modell ausgehend vom bestehenden Mongo-Schema. Identifiziere Entitäten, Beziehungen (1:1, 1:n, n:m), normalisiere auf sinnvolles Niveau und dokumentiere Relationstabellen.  
**Abhängigkeiten:**  
–  
**Story-Punkte:** M  

### DBM-SCHEMA-02 – Schlüssel, Indizes und Constraints definieren
**Beschreibung:**  
Lege Primärschlüssel-Strategie (z.B. UUID), Fremdschlüssel-Relationen, Unique-Constraints und notwendige Indizes fest. Dokumentiere diese als Teil des Schema-Designs.  
**Abhängigkeiten:**  
Depends on: DBM-SCHEMA-01  
**Story-Punkte:** S  

### DBM-SCHEMA-03 – TypeORM-Entities für Kern-Domänenmodelle
**Beschreibung:**  
Implementiere TypeORM-Entities für die wichtigsten Domänenobjekte (z.B. User, Rollen, Menüs, Items) inkl. Dekoratoren, Relationen und Basisfeldern laut Schema.  
**Abhängigkeiten:**  
Depends on: DBM-SCHEMA-01, DBM-SCHEMA-02  
**Story-Punkte:** M  

### DBM-SCHEMA-04 – Join-Tabellen und Many-to-Many-Relationen abbilden
**Beschreibung:**  
Implementiere Many-to-Many-Relationen und explizite Join-Tabellen in TypeORM, inkl. zusätzlicher Metadatenfelder, falls im Mongo-Schema vorhanden.  
**Abhängigkeiten:**  
Depends on: DBM-SCHEMA-01, DBM-SCHEMA-02, DBM-SCHEMA-03  
**Story-Punkte:** S  

### DBM-SCHEMA-05 – Daten-Typen und Konvertierung Mongo→MariaDB festlegen
**Beschreibung:**  
Definiere Mapping-Regeln von Mongo-Typen (ObjectId, Embedded Documents, Arrays) auf MariaDB-Spalten (UUID, Normalisierung in Tabellen, JSON-Felder falls nötig). Dokumentiere alle Regeln.  
**Abhängigkeiten:**  
Depends on: DBM-SCHEMA-01, DBM-SCHEMA-02  
**Story-Punkte:** S  

### DBM-SCHEMA-06 – Initiale TypeORM-Migrationen für Schema erzeugen
**Beschreibung:**  
Erzeuge TypeORM-Migrationsdateien für das vollständige Schema (Tabellen, Indizes, Constraints) und stelle sicher, dass ein leerer MariaDB-Stand korrekt aufgebaut werden kann.  
**Abhängigkeiten:**  
Depends on: DBM-SCHEMA-03, DBM-SCHEMA-04, DBM-SCHEMA-05  
**Story-Punkte:** S  

### DBM-SCHEMA-07 – Schema-Review & Freigabe
**Beschreibung:**  
Führe ein Review des Schema-Designs durch (Lesbarkeit, Normalisierung, Performance), gleiche es mit bisherigen Mongo-Use-Cases ab und dokumentiere offene Risiken/Annahmen.  
**Abhängigkeiten:**  
Depends on: DBM-SCHEMA-03, DBM-SCHEMA-06  
**Story-Punkte:** XS  

---

## Epic: DBM-EPIC-INFRA – Infrastruktur & TypeORM-Konfiguration

### DBM-INFRA-01 – MariaDB-Dev-Setup in Docker
**Beschreibung:**  
Erweitere oder ergänze `backend/docker-compose.yml` um einen MariaDB-Container für lokale Entwicklung inkl. Basis-Config (Port, Volumes, Charset, Zeitzone).  
**Abhängigkeiten:**  
–  
**Story-Punkte:** S  

### DBM-INFRA-02 – TypeORM Data Source & Konfiguration
**Beschreibung:**  
Richte TypeORM-Konfiguration (z.B. `data-source.ts` oder äquivalent) ein, inkl. Verbindungsparametern aus Umgebungsvariablen, Logging-Level und Connection-Pooling.  
**Abhängigkeiten:**  
Depends on: DBM-INFRA-01  
**Story-Punkte:** S  

### DBM-INFRA-03 – Umgebungsvariablen und Secrets-Handling
**Beschreibung:**  
Definiere und dokumentiere neue ENV-Variablen für MariaDB (Host, Port, User, Passwort, DB-Name). Stelle Kompatibilität für lokale Entwicklung, Test und Produktion sicher.  
**Abhängigkeiten:**  
Depends on: DBM-INFRA-01, DBM-INFRA-02  
**Story-Punkte:** XS  

### DBM-INFRA-04 – CI/CD-Schritt für TypeORM-Migrationen
**Beschreibung:**  
Füge der CI/CD-Pipeline einen Schritt hinzu, der MariaDB bereitstellt (z.B. via Docker), TypeORM-Migrationen ausführt und bei Fehlern den Build fehlschlagen lässt.  
**Abhängigkeiten:**  
Depends on: DBM-SCHEMA-06, DBM-INFRA-02  
**Story-Punkte:** M  

### DBM-INFRA-05 – Test-Datenbank für Integrationstests
**Beschreibung:**  
Richte eine separate MariaDB-Testdatenbank (lokal/CI) ein und automatisiere das Aufsetzen/Abreißen inkl. Ausführen der Migrationen vor Tests.  
**Abhängigkeiten:**  
Depends on: DBM-INFRA-02, DBM-INFRA-04  
**Story-Punkte:** S  

### DBM-INFRA-06 – Monitoring & Backups für MariaDB vorbereiten
**Beschreibung:**  
Planung und Basis-Setup für Backups und Monitoring (z.B. Dump-Skripte, Healthchecks, Log-Rotation) für MariaDB, um Betriebsrisiken zu minimieren.  
**Abhängigkeiten:**  
Depends on: DBM-INFRA-01, DBM-INFRA-02  
**Story-Punkte:** S  

---

## Epic: DBM-EPIC-MIG – Daten-Migration & Cutover

### DBM-MIG-01 – Migrationsstrategie & Cutover-Plan definieren
**Beschreibung:**  
Definiere die übergreifende Migrationsstrategie (z.B. mehrere Staging-Durchläufe, finaler Cutover mit Downtime, kein Dual-Write) inkl. Backout-Szenario.  
**Abhängigkeiten:**  
Depends on: DBM-SCHEMA-07, DBM-INFRA-01  
**Story-Punkte:** M  

### DBM-MIG-02 – Exportmechanismus aus MongoDB implementieren
**Beschreibung:**  
Implementiere einen reproduzierbaren Export aus MongoDB (Snapshots) für alle relevanten Collections, inkl. Filtern, Sortierung und Basisvalidierung der Rohdaten.  
**Abhängigkeiten:**  
Depends on: DBM-MIG-01  
**Story-Punkte:** S  

### DBM-MIG-03 – Transformation Mongo-Dokumente → MariaDB-DTOs
**Beschreibung:**  
Implementiere Transformationsfunktionen (z.B. in `scripts/transformers/*`), die Mongo-Dokumente gemäß den Schema-Mapping-Regeln (inkl. ObjectId→UUID) in relationale DTOs überführen.  
**Abhängigkeiten:**  
Depends on: DBM-SCHEMA-05, DBM-MIG-02  
**Story-Punkte:** M  

### DBM-MIG-04 – Batch-Insert & Transaktionslogik für Migration
**Beschreibung:**  
Implementiere ein Migrationsskript (z.B. `scripts/migrate-from-mongo.ts`), das Daten in Batches nach MariaDB schreibt, Transaktionen pro logischer Gruppe nutzt und bei Fehlern konsistent abbricht.  
**Abhängigkeiten:**  
Depends on: DBM-MIG-03, DBM-INFRA-02  
**Story-Punkte:** M  

### DBM-MIG-05 – IDs-Strategie konkret umsetzen (UUIDs, Foreign Keys)
**Beschreibung:**  
Setze die finale ID-Strategie um (z.B. UUIDs statt ObjectId), inkl. Generierung, Speicherung und Konsistenz über alle referenzierenden Tabellen.  
**Abhängigkeiten:**  
Depends on: DBM-SCHEMA-02, DBM-MIG-03  
**Story-Punkte:** S  

### DBM-MIG-06 – Staging-Migrationslauf mit Echtdaten-Snapshot
**Beschreibung:**  
Führe mindestens einen vollständigen Migrationslauf auf einer Staging-Umgebung mit realistischem Daten-Snapshot durch und dokumentiere Laufzeiten, Fehler und Datenqualität.  
**Abhängigkeiten:**  
Depends on: DBM-MIG-04, DBM-MIG-05, DBM-INFRA-05  
**Story-Punkte:** M  

### DBM-MIG-07 – Validierung der Datenkonsistenz nach Migration
**Beschreibung:**  
Vergleiche Zählwerte, Referenzen und zentrale Domäneninvarianten zwischen Mongo-Quelle und MariaDB-Ziel. Erstelle automatisierte Checks und Berichte für Abweichungen.  
**Abhängigkeiten:**  
Depends on: DBM-MIG-06  
**Story-Punkte:** S  

### DBM-MIG-08 – Performance-Tuning der Migration (Batchgrößen, Indizes)
**Beschreibung:**  
Analysiere die Migrationsperformance (Batchgrößen, Transaktionsdauer, Sperren) und optimiere Skripte, Indizes und Konfigurationen für den finalen Cutover.  
**Abhängigkeiten:**  
Depends on: DBM-MIG-06, DBM-SCHEMA-02  
**Story-Punkte:** S  

---

## Epic: DBM-EPIC-APP – App-Anpassungen & Repositories

### DBM-APP-01 – Abstraktionsschicht für Datenzugriff vorbereiten
**Beschreibung:**  
Identifiziere alle Mongo-spezifischen Zugriffe (Repos/Services) und führe, falls nötig, eine abstrahierende Schnittstelle ein, um den Wechsel auf TypeORM zu erleichtern.  
**Abhängigkeiten:**  
Depends on: DBM-SCHEMA-07  
**Story-Punkte:** S  

### DBM-APP-02 – TypeORM-Repositories für Kern-Use-Cases implementieren
**Beschreibung:**  
Ersetze die bisherigen Mongo-Repositories durch TypeORM-Repositories für alle zentralen Use-Cases, inkl. Abbildung von Queries und Paginierung.  
**Abhängigkeiten:**  
Depends on: DBM-APP-01, DBM-INFRA-02, DBM-SCHEMA-03  
**Story-Punkte:** M  

### DBM-APP-03 – Anpassung der Services an TypeORM-Modelle
**Beschreibung:**  
Passe Service-Layer-Logik an die neuen Entities und Repositories an (Transaktionen, Fehlerbehandlung, Lazy/Eager-Loading), ohne API-Verhalten für Clients zu brechen.  
**Abhängigkeiten:**  
Depends on: DBM-APP-02  
**Story-Punkte:** M  

### DBM-APP-04 – DTOs und Validierung aktualisieren
**Beschreibung:**  
Überprüfe und aktualisiere DTOs, Validation-Pipes und Mapping-Logik zwischen API-Requests/Responses und TypeORM-Entities, um Felder, Typen und Constraints zu harmonisieren.  
**Abhängigkeiten:**  
Depends on: DBM-APP-03  
**Story-Punkte:** S  

### DBM-APP-05 – API-Verträge und Dokumentation validieren
**Beschreibung:**  
Stelle sicher, dass externe API-Verträge (Routen, Payloads, Statuscodes) unverändert bleiben oder dokumentiere breaking changes inkl. Migrationshinweisen für Konsumenten.  
**Abhängigkeiten:**  
Depends on: DBM-APP-04  
**Story-Punkte:** S  

### DBM-APP-06 – Queries & Aggregationen auf SQL umstellen
**Beschreibung:**  
Übersetze bisherige Mongo-Aggregationspipelines in SQL-/TypeORM-Abfragen (Joins, GROUP BY, ggf. Fensterfunktionen) und stelle funktionale Gleichheit sicher.  
**Abhängigkeiten:**  
Depends on: DBM-APP-02, DBM-SCHEMA-01  
**Story-Punkte:** M  

### DBM-APP-07 – Feature-Flags / Konfiguration für DB-Switch
**Beschreibung:**  
Implementiere, falls sinnvoll, eine Konfiguration oder ein Feature-Flag, um zwischen Mongo- und MariaDB-Pfad zu unterscheiden (für Tests und schrittweisen Rollout).  
**Abhängigkeiten:**  
Depends on: DBM-APP-01, DBM-INFRA-02  
**Story-Punkte:** S  

---

## Epic: DBM-EPIC-TEST – Tests, Qualität & Risiko-Checks

### DBM-TEST-01 – Unit-Tests für Transformationslogik
**Beschreibung:**  
Schreibe Unit-Tests für die Mappings (Mongo-Dokument → MariaDB-DTO/Entity), inkl. Randfälle, Defaults und Fehlerfälle, basierend auf den Mapping-Regeln.  
**Abhängigkeiten:**  
Depends on: DBM-MIG-03  
**Story-Punkte:** S  

### DBM-TEST-02 – Integrationstests gegen MariaDB-Container
**Beschreibung:**  
Implementiere Integrationstests, die gegen eine echte MariaDB-Instanz (Docker) laufen, inklusive Ausführen der Migrationen und Testen zentraler Repositories/Services.  
**Abhängigkeiten:**  
Depends on: DBM-INFRA-05, DBM-APP-02  
**Story-Punkte:** M  

### DBM-TEST-03 – End-to-End-Tests für zentrale User-Flows
**Beschreibung:**  
Erweitere oder passe E2E-Tests an, um sicherzustellen, dass wesentliche Geschäftsprozesse mit MariaDB als Datenbank fehlerfrei funktionieren.  
**Abhängigkeiten:**  
Depends on: DBM-APP-03, DBM-TEST-02  
**Story-Punkte:** M  

### DBM-TEST-04 – Tests für Migrationsskripte und Rollback
**Beschreibung:**  
Erstelle Tests, die Migrationsläufe simulieren, Fehler provozieren und Rollback-Szenarien verifizieren (Transaktionen, Idempotenz, Wiederanlaufbarkeit).  
**Abhängigkeiten:**  
Depends on: DBM-MIG-04  
**Story-Punkte:** M  

### DBM-TEST-05 – Performance-Tests für kritische Queries
**Beschreibung:**  
Führe Performance-Tests für wichtige Abfragen und Aggregationen durch (EXPLAIN, Laufzeiten, Index-Nutzung) und dokumentiere Optimierungspotential.  
**Abhängigkeiten:**  
Depends on: DBM-APP-06, DBM-SCHEMA-02  
**Story-Punkte:** S  

### DBM-TEST-06 – Sicherheits- und Berechtigungstests für MariaDB
**Beschreibung:**  
Überprüfe DB-User-Berechtigungen (least privilege), injektionssichere Queries und ggf. Verschlüsselungsanforderungen und ergänze entsprechende Tests/Checks.  
**Abhängigkeiten:**  
Depends on: DBM-INFRA-03, DBM-INFRA-06  
**Story-Punkte:** S  

### DBM-TEST-07 – Datenqualitäts-Checks nach Staging-Läufen automatisieren
**Beschreibung:**  
Automatisiere Datenqualitäts-Reports (z.B. Counts, Checksummen, Stichprobenvergleiche) auf Basis der Staging-Migrationsläufe und bereite sie für Freigabeentscheidungen auf.  
**Abhängigkeiten:**  
Depends on: DBM-MIG-06, DBM-MIG-07  
**Story-Punkte:** S  

---

## Epic: DBM-EPIC-ROLLOUT – Rollout, Betrieb & Umschaltung

### DBM-ROLLOUT-01 – Betriebs- und Downtime-Vorgaben klären
**Beschreibung:**  
Klärung mit Stakeholdern, welche Downtime akzeptabel ist, wann Migrationsfenster liegen und welche Kommunikationswege bei Problemen genutzt werden.  
**Abhängigkeiten:**  
Depends on: DBM-MIG-01  
**Story-Punkte:** XS  

### DBM-ROLLOUT-02 – Finalen Cutover-Runbook erstellen
**Beschreibung:**  
Dokumentiere ein schrittweises Runbook für den finalen Cutover (Stop von Schreibzugriffen, finaler Export, Migration, Verifikation, Umschalten der App, Backout-Option).  
**Abhängigkeiten:**  
Depends on: DBM-MIG-06, DBM-MIG-07, DBM-ROLLOUT-01  
**Story-Punkte:** S  

### DBM-ROLLOUT-03 – Feature-Flag/Config auf MariaDB umstellen
**Beschreibung:**  
Schalte die Applikation im kontrollierten Rahmen auf MariaDB um (Feature-Flag oder Config), überwache Verhalten und Performance und documentiere Ergebnisse.  
**Abhängigkeiten:**  
Depends on: DBM-APP-07, DBM-TEST-03, DBM-MIG-06  
**Story-Punkte:** S  

### DBM-ROLLOUT-04 – Produktiver Migrationslauf und Monitoring
**Beschreibung:**  
Führe den produktiven Migrationslauf gemäß Runbook durch, überwache Logs, Metriken und Fehlerraten und ziehe bei Problemen das Backout-Szenario.  
**Abhängigkeiten:**  
Depends on: DBM-ROLLOUT-02, DBM-ROLLOUT-03  
**Story-Punkte:** L  

### DBM-ROLLOUT-05 – Post-Mortem & Lessons Learned
**Beschreibung:**  
Erstelle ein kurzes Post-Mortem zum Migrationsprojekt (was lief gut/schlecht, Verbesserungsvorschläge) und aktualisiere relevante Dokumentation.  
**Abhängigkeiten:**  
Depends on: DBM-ROLLOUT-04  
**Story-Punkte:** XS  

---

## Epic: DBM-EPIC-ERASE – Erase MongoDB

### DBM-ERASE-01 – Mongo-spezifischen Code identifizieren und markieren
**Beschreibung:**  
Liste alle Mongo-spezifischen Codepfade, Konfigurationen und Skripte auf (z.B. Repositories, Initialisierungen, Config), die nach erfolgreichem Rollout entfernt werden können.  
**Abhängigkeiten:**  
Depends on: DBM-APP-02, DBM-ROLLOUT-04  
**Story-Punkte:** S  

### DBM-ERASE-02 – Entfernen von MongoDB aus Docker-Setup
**Beschreibung:**  
Entferne MongoDB-Services und Volumes aus Docker-Konfigurationen (z.B. `backend/docker-compose.yml`, ggf. weitere Compose-Files), ohne MariaDB oder andere Services zu beeinträchtigen.  
**Abhängigkeiten:**  
Depends on: DBM-ERASE-01  
**Story-Punkte:** S  

### DBM-ERASE-03 – Entfernen von MongoDB aus CI/CD-Pipeline
**Beschreibung:**  
Bereinige CI/CD-Pipelines von Mongo-spezifischen Schritten (Container-Setup, Seeds, Healthchecks) und stelle sicher, dass nur MariaDB-relevante Schritte verbleiben.  
**Abhängigkeiten:**  
Depends on: DBM-ERASE-01, DBM-INFRA-04  
**Story-Punkte:** S  

### DBM-ERASE-04 – Bereinigung von Dockerfiles und Startskripten
**Beschreibung:**  
Entferne Mongo-spezifische Layer, Umgebungsvariablen und Startlogik aus Dockerfiles und Startskripten (z.B. `backend/Dockerfile`, `start.bat`), ggf. mit Fallbacks.  
**Abhängigkeiten:**  
Depends on: DBM-ERASE-01  
**Story-Punkte:** S  

### DBM-ERASE-05 – Entfernen Mongo-spezifischer Repositories und Konfiguration
**Beschreibung:**  
Lösche oder refaktoriere nicht mehr benötigte Mongo-Repository-Klassen, Konfigurationsabschnitte und Connection-Initialisierungen, sodass nur noch TypeORM/MariaDB genutzt wird.  
**Abhängigkeiten:**  
Depends on: DBM-ERASE-01, DBM-APP-03, DBM-ROLLOUT-04  
**Story-Punkte:** M  

### DBM-ERASE-06 – Letzte Daten-/Backup-Strategie für alte Mongo-Instanz
**Beschreibung:**  
Entscheide und dokumentiere, wie lange alte Mongo-Daten/Backups aufbewahrt werden und wie die finale Deprovisionierung der Mongo-Instanz erfolgen soll.  
**Abhängigkeiten:**  
Depends on: DBM-ROLLOUT-04  
**Story-Punkte:** XS  

### DBM-ERASE-07 – Abschluss-Review „Mongo vollständig entfernt?“
**Beschreibung:**  
Überprüfe Codebasis, Infrastruktur und Dokumentation darauf, dass keine aktiven Mongo-Referenzen mehr existieren, und dokumentiere den Abschluss des Erase-Schritts.  
**Abhängigkeiten:**  
Depends on: DBM-ERASE-02, DBM-ERASE-03, DBM-ERASE-04, DBM-ERASE-05, DBM-ERASE-06  
**Story-Punkte:** XS
