# Unified Project Documentation (CONSOLIDATED)

This document consolidates key READMEs and LUD28-related docs into a single entrypoint.

## Purpose
- Provide a single, short entry for developers working on the LUD28 project and running tests.
- Point to more detailed archived docs when needed.

## Quick start (dev)
1. Start local test DB (use project's docker-compose when available):

   - See `backend/nest-app/docker-compose.test.yml` or run local Postgres on port 5433.

2. Install dependencies

```bash
cd backend/nest-app
npm install
```

3. Run tests (serial):

```bash
npm test
```

Notes: The tests are configured to run in-band to avoid test DB race conditions.

## Project-specific notes (consolidated)
- Home Assistant entities & migrations: `docs/migrations/*` and `database/*` contain schema and mapping information. For DB schema mapping see: `database/DBM-SCHEMA-03-TypeORM-Mapping.md`.
- STT / Speech: speech docs and validation guides are in `docs/archive/SPEECH_*`.
- LLM/Agents: `docs/archive/LLM_*` contains runtime and testing hints.

## LUD28 ticket summary
- Implementation and test fixes for LUD28 (integration tests & migrations) were consolidated. See `docs/implementation-scope/LUD28-108-COMPLETE.md` for the implementation summary and `docs/tests/LUD28-110-IMPLEMENTATION-SUMMARY.md` for test results.

## Where to look next (archived docs)
- Implementation scope: `docs/implementation-scope/`
- Tests & migrations: `docs/migrations/` and `docs/tests/`
- Legacy guidance & troubleshooting: `docs/archive/`

---

This file is the single entrypoint created by maintenance automation; older READMEs were annotated as "CONSOLIDATED" and preserved for reference in case of broken external links.

