# Backend (NestJS + MongoDB)

Dieses Backend stellt eine NestJS-API bereit, die über Mongoose auf eine MongoDB zugreift. Die MongoDB läuft via Docker Compose im Ordner `backend/`.

## Inhalt
- NestJS-App: `backend/nest-app/`
- Docker Compose (MongoDB): `backend/docker-compose.yml`
- Umgebungsvariablen-Vorlage: `backend/.env.example` (lokal nach `.env` kopieren)

## Voraussetzungen
- Node.js >= 18
- Docker + Docker Compose

## Umgebungsvariablen (`backend/.env`)
Kopiere die Vorlage:

```bash
cp backend/.env.example backend/.env
```

Folgende Variablen stehen zur Verfügung:

- NEST_PORT=3001
- MONGO_URI=mongodb://localhost:27017/raueberbude
- MONGO_HOST=localhost
- MONGO_PORT=27017
- MONGO_DB=raueberbude
- MONGO_USER=rb_root
- MONGO_PASSWORD=rb_secret
- MONGO_AUTH_SOURCE=admin

Docker Compose (MongoDB):
- MONGO_INITDB_ROOT_USERNAME=rb_root
- MONGO_INITDB_ROOT_PASSWORD=rb_secret
- MONGO_INITDB_DATABASE=raueberbude

Hinweis: Die NestJS-App verwendet `MONGO_URI`, falls gesetzt. Andernfalls wird die URI aus `MONGO_HOST/PORT/DB/USER/PASSWORD/AUTH_SOURCE` zusammengesetzt.

## Start MongoDB via Docker Compose
Im Ordner `backend/` ausführen:

```bash
# Start (detached)
docker compose up -d

# Logs ansehen
docker compose logs -f

# Stoppen
docker compose down
```

## NestJS-App starten
Installation und Start der API (im Ordner `backend/nest-app/`):

```bash
npm install
npm run start:dev
```

Die API läuft anschließend standardmäßig unter `http://localhost:3001` (über `NEST_PORT` anpassbar).

## Users CRUD (Beispiel)
- POST `/users`  -> User anlegen, Body: `{ "username": "alice", "email": "alice@example.com" }`
- GET  `/users`  -> Alle User
- GET  `/users/:id` -> Einzelner User
- PATCH `/users/:id` -> Teil-Update
- DELETE `/users/:id` -> Löschen

### Beispiel-Requests
```bash
# Create
curl -X POST http://localhost:3001/users \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","email":"alice@example.com"}'

# List
curl http://localhost:3001/users

# Get by id
curl http://localhost:3001/users/<id>

# Update
curl -X PATCH http://localhost:3001/users/<id> \
  -H "Content-Type: application/json" \
  -d '{"email":"alice+new@example.com"}'

# Delete
curl -X DELETE http://localhost:3001/users/<id>
```

## Hinweise
- Die bestehende Express-Implementierung unter `backend/` bleibt unberührt. Die neue NestJS-App liegt in `backend/nest-app/`.
- Für lokale Entwicklung reicht es, `MONGO_URI` nicht zu setzen und stattdessen mit den Einzelwerten (`MONGO_HOST=localhost`, etc.) zu arbeiten.
- Für Docker-Workflows empfiehlt sich die Auth via `MONGO_USER/MONGO_PASSWORD` und `MONGO_AUTH_SOURCE=admin`.

## Compose-Konflikte (Root vs. backend/)
- Im Projekt-Root existiert bereits `docker-compose.yml`, das eine MongoDB auf Port 27017 exponiert.
- Um Port-Konflikte zu vermeiden, exponiert `backend/docker-compose.yml` den MongoDB-Port nicht nach außen. Die NestJS-API spricht die DB im Compose-Netz über den Servicenamen `mongo` an.
- Wenn du die DB vom Host erreichen willst, nutze das Root-Compose oder passe das Port-Mapping in `backend/docker-compose.yml` an.

## CORS
- Standard: `CORS_ORIGINS=http://localhost:4200,http://127.0.0.1:4200`
- Anpassbar über `.env` für weitere Origins (kommagetrennt).

## Health
- Endpoint: `GET /health`
- Antwort enthält Status, DB-Zustand, Uptime und Timestamp.

## Dockerized API (Compose)
- Die API ist als Service `api` im `backend/docker-compose.yml` enthalten.
- Starten:
  ```bash
  docker compose up -d --build
  ```
- Aufruf: `http://localhost:3001`
