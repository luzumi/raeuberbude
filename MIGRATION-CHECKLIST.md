# MongoDB → MariaDB Migration - Ausführungs-Checkliste

## Vor der Migration

- [ ] **Backup erstellen**
  ```bash
  # MongoDB Backup
  mongodump --uri="mongodb://rb_root:rb_secret@localhost:27018/raueberbude?authSource=admin" --out=./backup-mongo-$(date +%Y%m%d)
  
  # MariaDB Backup
  mysqldump -h 127.0.0.1 -P 3307 -u rb_user -prb_user_secret raueberbude > backup-maria-$(date +%Y%m%d).sql
  ```

- [ ] **Datenbankverbindungen prüfen**
  ```bash
  # MongoDB erreichbar?
  mongo --host localhost --port 27018 -u rb_root -p rb_secret --authenticationDatabase admin
  
  # MariaDB erreichbar?
  mysql -h 127.0.0.1 -P 3307 -u rb_user -prb_user_secret raueberbude -e "SELECT VERSION();"
  ```

- [ ] **App stoppen** (falls läuft)
  ```bash
  # Alle Node-Prozesse beenden oder Ctrl+C im Terminal
  ```

- [ ] **Git-Status sauber**
  ```bash
  git status
  git add .
  git commit -m "chore: prepare for mongodb to mariadb migration"
  ```

## Migration durchführen

### Option 1: Automatisches Script (Empfohlen)

- [ ] **PowerShell-Script ausführen**
  ```powershell
  cd C:\Users\corat\IdeaProjects\raueberbude
  .\scripts\run-migration.ps1
  ```

- [ ] **Warten auf Aufforderung zum App-Start**
  - [ ] Neues Terminal öffnen
  - [ ] App starten: `npm run start:dev`
  - [ ] Warten auf Log: `[HaSyncService] Synced X/Y`
  - [ ] ENTER im Migrations-Terminal drücken

- [ ] **Migration abwarten** (kann mehrere Minuten dauern)

### Option 2: Manuelle Schritte

- [ ] **Schritt 1: Neue Tabellen erstellen**
  ```bash
  mysql -h 127.0.0.1 -P 3307 -u rb_user -prb_user_secret raueberbude < scripts/create-llm-and-category-tables.sql
  ```

- [ ] **Schritt 2: Tabellen leeren**
  ```bash
  node scripts/step1_truncate_tables.js
  ```

- [ ] **Schritt 3: App starten**
  ```bash
  npm run start:dev
  ```
  Warten auf: `[HaSyncService] Synced X/Y`

- [ ] **Schritt 4: Collections migrieren**
  ```bash
  node scripts/step2_migrate_collections.js
  ```

## Nach der Migration

- [ ] **Verifikation durchführen**
  ```bash
  node scripts/verify_migration.js
  ```

- [ ] **Ergebnis prüfen**
  - [ ] Alle Collections haben Match: ✅
  - [ ] Keine Fehler in der Zusammenfassung
  - [ ] Anzahl Dokumente stimmt überein

- [ ] **App-Funktionalität testen**
  - [ ] Frontend aufrufen: http://localhost:4200
  - [ ] Login testen
  - [ ] HomeAssistant-Daten laden
  - [ ] Transcript erstellen
  - [ ] Intent-Log erstellen
  - [ ] Logs prüfen auf Fehler

- [ ] **Smoke-Tests ausführen** (falls vorhanden)
  ```bash
  npm run test:e2e
  # oder
  npm run test:smoke
  ```

## Bei Erfolg

- [ ] **MongoDB-Services deaktivieren**
  - [ ] `@nestjs/mongoose` aus app.module.ts entfernen
  - [ ] Mongoose-Imports entfernen
  - [ ] Nur TypeORM verwenden

- [ ] **Git-Commit**
  ```bash
  git add .
  git commit -m "feat: complete mongodb to mariadb migration"
  git push
  ```

- [ ] **Dokumentation aktualisieren**
  - [ ] README.md anpassen (MongoDB entfernen)
  - [ ] ENV-Variables dokumentieren
  - [ ] Setup-Anleitung aktualisieren

- [ ] **Ticket schließen**
  - [ ] LUD28-59.7 auf "Done" setzen
  - [ ] Kommentar mit Migrations-Ergebnis hinzufügen

## Bei Problemen

- [ ] **Logs analysieren**
  - [ ] Migrations-Script-Output prüfen
  - [ ] App-Logs prüfen (`npm run start:dev` Terminal)
  - [ ] MariaDB-Logs prüfen

- [ ] **Rollback durchführen**
  ```bash
  # Tabellen leeren
  node scripts/step1_truncate_tables.js
  
  # MongoDB-Backup wiederherstellen (falls nötig)
  mongorestore --uri="mongodb://rb_root:rb_secret@localhost:27018/raueberbude?authSource=admin" ./backup-mongo-YYYYMMDD
  
  # MariaDB-Backup wiederherstellen (falls nötig)
  mysql -h 127.0.0.1 -P 3307 -u rb_user -prb_user_secret raueberbude < backup-maria-YYYYMMDD.sql
  ```

- [ ] **Problem dokumentieren**
  - [ ] Fehlermeldung kopieren
  - [ ] Kontext notieren
  - [ ] Ticket kommentieren

- [ ] **Migration erneut versuchen** (nach Problem-Behebung)
  ```bash
  # Von vorne beginnen
  .\scripts\run-migration.ps1
  ```

## Später: MongoDB komplett entfernen

⚠️ **Erst nach erfolgreicher Produktiv-Migration!**

- [ ] **MongoDB-Container stoppen**
  ```bash
  docker stop mongodb-container-name
  ```

- [ ] **MongoDB aus docker-compose.yml entfernen**

- [ ] **MongoDB-Datenordner löschen**
  ```bash
  rm -rf ./data/mongodb
  ```

- [ ] **Mongoose-Dependencies entfernen**
  ```bash
  npm uninstall mongoose @nestjs/mongoose
  ```

- [ ] **Legacy-Models löschen**
  ```bash
  rm -rf backend/models
  ```

---

## Zeitschätzung

- Vorbereitung: 10 min
- Migration: 10-30 min (je nach Datenmenge)
- Verifikation: 5 min
- Tests: 15 min
- **Gesamt: ca. 40-60 min**

## Support

Bei Fragen oder Problemen:
- Dokumentation: `MIGRATION-GUIDE.md`
- Quickstart: `MIGRATION-QUICKSTART.md`
- Ticket: LUD28-59.7

---

**Viel Erfolg! 🚀**

