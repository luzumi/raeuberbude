Aufräum-/Skript-Übersicht

Ziel: themenorientierte Struktur für temporäre und Hilfs-Skripte, damit das Projekt aufgeräumt bleibt.

Ordner:
- scripts/ha/         -> HomeAssistant-spezifische Hilfsskripte (Import, Migration)
- scripts/migration/  -> Migration-Utilities von MongoDB -> MariaDB (große Migrationsskripte)
- scripts/debug/      -> Kurzlebige Debug- und Preview-Skripte
- scripts/tests/      -> kleine Testskripte zum schnellen Ausführen
- scripts/tools/      -> sonstige Hilfswerkzeuge
- scripts/archive/    -> Archivierte Originalskripte (nur lesbar)

Wiederherstellung:
- Originale Inhalte sind (teilweise) in scripts/archive/original-scripts.json gesichert.
- Um ein Skript wiederherzustellen, kopiere den Inhalt aus der JSON-Datei in die Ziel-Datei oder verwende Git, um die frühere Version wiederherzustellen.

Hinweis:
- Top-level Skripte in `scripts/` wurden als Stubs belassen und verweisen auf die thematisierten Ordner oder auf das Archiv.
- Wenn du möchtest, kann ich die Archiv-Datei in mehrere einzelne Dateien extrahieren oder ein ZIP erzeugen.

