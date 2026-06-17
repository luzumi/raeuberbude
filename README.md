# Raeuberbude

Angular frontend with a Node/NestJS backend and supporting services. This root
README is the entrypoint; detailed guides live in the docs folder.

## Repo layout
- `src/`: Angular frontend
- `backend/`: backend services (NestJS app in `backend/nest-app`)
- `database/`: schema/migration notes and DB-related docs
- `docs/`: consolidated documentation entrypoint

## Quick start (frontend only)
```bash
npm install
npm start
```

Frontend dev server runs on `http://localhost:4200`.

## Quick start (frontend + Nest backend)
```bash
npm install
npm --prefix backend/nest-app install
npm run start:dev
```

This runs Angular on `:4200` and the NestJS API on `:3001`.

## Backend database (MongoDB)
See `backend/README.md` for environment setup and Docker Compose options.

## Tests
Frontend:
```bash
npm run test:unit
npm run test:e2e
```

Backend (NestJS):
```bash
npm --prefix backend/nest-app test
```

## Documentation
- `docs/UNIFIED_DOCS.md` (single consolidated entrypoint)
- `backend/README.md` (backend setup)
- `database/README.md` (DB notes)
