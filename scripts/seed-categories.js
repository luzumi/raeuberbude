/* eslint-disable no-console */

// Simple admin helper to create/seed categories via backend API.
// Usage: node scripts/seed-categories.js

const BASE = process.env.BACKEND_URL || 'http://localhost:3001';
const axios = require('axios');

const categories = [
  { key: 'home_assistant_command', label: 'Home Assistant Befehl' },
  { key: 'home_assistant_query', label: 'Home Assistant Anfrage' },
  { key: 'general_question', label: 'Allgemeine Frage' },
  { key: 'smalltalk', label: 'Smalltalk' },
  { key: 'unknown', label: 'Unbekannt' },
];

async function postCategory(cat) {
  const res = await axios.post(
    `${BASE}/api/categories`,
    { ...cat, description: cat.description ?? null },
    { timeout: 10_000 }
  );
  return res.data;
}

async function main() {
  console.log(`Seeding categories to ${BASE} ...`);
  for (const c of categories) {
    try {
      const created = await postCategory(c);
      console.log(`✓ ${c.key} -> ${created.id ?? created._id ?? 'ok'}`);
    } catch (e) {
      console.error(`✗ ${c.key}`, e);
    }
  }

  const list = (await axios.get(`${BASE}/api/categories`, { timeout: 10_000 })).data;
  console.log(`\nNow ${Array.isArray(list) ? list.length : 0} categories available.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
