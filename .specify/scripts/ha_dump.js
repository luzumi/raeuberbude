#!/usr/bin/env node
/*
  Home Assistant Snapshot Script
  - Liest:
    GET /api/states
    GET /api/services
    GET /api/config
    GET /api/events
    GET /api/error_log (optional)
  - Auth: Long-Lived Access Token -> Header: Authorization: Bearer <TOKEN>
  - Ausgabe: ha_structure_[timestamp].json

  Env/CLI:
    HA_BASE_URL   (z. B. http://localhost:8123)
    HA_TOKEN      (Long-Lived Access Token)

    Flags überschreiben Env:
      --base=http://...   --token=XXXXX
*/

const fs = require('node:fs');
const path = require('node:path');
const process = require('node:process');
const axios = require('axios');
try { require('dotenv').config(); } catch (e) { console.log(e.message)}

function parseArgs(argv) {
  const out = {};
  for (const a of argv.slice(2)) {
    const m = /^--([^=]+)=(.*)$/.exec(a);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

(async () => {
  const args = parseArgs(process.argv);
  const BASE = (args.base || process.env.HA_BASE_URL || '').replace(/\/$/, '');
  const TOKEN = args.token || process.env.HA_TOKEN || '';
  if (!BASE || !TOKEN) {
    console.error('Fehler: HA_BASE_URL und HA_TOKEN erforderlich. Beispiel:');
    console.error('  HA_BASE_URL=http://localhost:8123 HA_TOKEN=... node .specify/scripts/ha_dump.js');
    process.exit(2);
  }

  const client = axios.create({
    baseURL: BASE,
    timeout: 15000,
    headers: { Authorization: `Bearer ${TOKEN}` },
    validateStatus: (s) => s >= 200 && s < 300,
  });

  async function getJson(url) {
    try {
      const { data } = await client.get(url);
      return data;
    } catch (e) {
      return { __error: true, status: e.response?.status, message: String(e?.message || e) };
    }
  }

  const ts = new Date().toISOString();
  const [states, services, config, events, errorLog] = await Promise.all([
    getJson('/api/states'),
    getJson('/api/services'),
    getJson('/api/config'),
    getJson('/api/events'),
    getJson('/api/error_log'), // optional; kann Fehler zurückgeben
  ]);

  // Entities nach Domain gruppieren
  const entitiesByDomain = {};
  if (Array.isArray(states)) {
    for (const s of states) {
      const entityId = s.entity_id || s.entityId || '';
      const [domain] = entityId.split('.');
      if (!entitiesByDomain[domain]) entitiesByDomain[domain] = [];
      const attributes = s.attributes || {};
      entitiesByDomain[domain].push({
        entity_id: entityId,
        state: s.state,
        attributes,
        friendly_name: attributes.friendly_name || null,
      });
    }
  }

  // Services Struktur beibehalten
  const servicesMap = {};
  if (Array.isArray(services)) {
    // neuere HA liefert Objekt { domain: { service: schema } } — ältere evtl. Array
    for (const svc of services) {
      // falls Array-Format: { domain: 'light', services: { turn_on: {...} } }
      if (svc && svc.domain && svc.services) {
        servicesMap[svc.domain] = svc.services;
      }
    }
  } else if (services && typeof services === 'object') {
    Object.assign(servicesMap, services);
  }

  // Home Assistant Version aus config
  const haVersion = config?.version || config?.core?.version || null;

  // Devices/Areas: per REST meist nicht verfügbar; best-effort (leer, wenn nicht vorhanden)
  let areas = [];
  let devices = [];
  // Optionaler Versuch, falls Installation REST-Helper-Endpunkte bereitstellt
  for (const tryUrl of ['/api/area_registry/list', '/api/areas']) {
    const a = await getJson(tryUrl);
    if (Array.isArray(a)) { areas = a; break; }
  }
  for (const tryUrl of ['/api/device_registry/list', '/api/devices']) {
    const d = await getJson(tryUrl);
    if (Array.isArray(d)) { devices = d; break; }
  }

  const out = {
    timestamp: ts,
    home_assistant_version: haVersion,
    entities: entitiesByDomain,
    services: servicesMap,
    areas,
    devices,
  };

  // Optional: Error-Log ablegen (nur wenn erfolgreich)
  if (typeof errorLog === 'string') {
    out.error_log_excerpt = errorLog.slice(0, 2000);
  }

  const safeTs = ts.replace(/[:]/g, '-');
  const file = path.resolve(process.cwd(), `ha_structure_${safeTs}.json`);
  fs.writeFileSync(file, JSON.stringify(out, null, 2), 'utf8');
  console.log('OK ->', file);
})();
