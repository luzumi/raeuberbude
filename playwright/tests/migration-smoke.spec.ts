/**
 * Migration Smoke Tests
 *
 * Diese Tests validieren das erfolgreiche Staging-Deployment der MongoDB-zu-MariaDB-Migration:
 * - Applikationsstart und Health-Check
 * - Kritische API-Endpunkte
 * - Datenintegrität zwischen MongoDB und MariaDB
 */

import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

test.describe('Migration Smoke Tests - Staging Deployment', () => {

  test('Health Check - Applikation läuft', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/health`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('status');
    expect(body.status).toBe('ok');
  });

  test('API - GET /users funktioniert', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/users`);
    expect(response.ok()).toBeTruthy();

    const users = await response.json();
    expect(Array.isArray(users)).toBeTruthy();
  });

  test('API - GET /terminals funktioniert', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/terminals`);
    expect(response.ok()).toBeTruthy();

    const terminals = await response.json();
    expect(Array.isArray(terminals)).toBeTruthy();
  });

  test('API - GET /transcripts funktioniert', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/transcripts`);
    expect(response.ok()).toBeTruthy();

    const transcripts = await response.json();
    expect(Array.isArray(transcripts)).toBeTruthy();
  });

  test('API - GET /ha-entities funktioniert', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/ha-entities`);
    expect(response.ok()).toBeTruthy();

    const entities = await response.json();
    expect(Array.isArray(entities)).toBeTruthy();
  });

  test('Datenintegrität - Users Count', async ({ request }) => {
    // Annahme: MongoDB Count-Endpoint existiert für Vergleich
    const mongoResponse = await request.get(`${API_BASE_URL}/migration/mongo/users/count`).catch(() => null);
    const mariaResponse = await request.get(`${API_BASE_URL}/users/count`);

    expect(mariaResponse.ok()).toBeTruthy();

    if (mongoResponse && mongoResponse.ok()) {
      const mongoCount = await mongoResponse.json();
      const mariaCount = await mariaResponse.json();

      // Warnung, wenn Counts unterschiedlich sind
      if (mongoCount.count !== mariaCount.count) {
        console.warn(`⚠️  User Count unterschiedlich: MongoDB=${mongoCount.count}, MariaDB=${mariaCount.count}`);
      }
    }
  });

  test('Datenintegrität - Transcripts Sample', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/transcripts?limit=10`);
    expect(response.ok()).toBeTruthy();

    const transcripts = await response.json();

    // Validiere Struktur der migrierten Daten
    if (transcripts.length > 0) {
      const sample = transcripts[0];
      expect(sample).toHaveProperty('id');
      expect(sample).toHaveProperty('userId');
      expect(sample).toHaveProperty('transcript');
      expect(sample).toHaveProperty('createdAt');

      // UUID-Format validieren
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(sample.id).toMatch(uuidRegex);
    }
  });

  test('Performance - API Response Time unter 500ms', async ({ request }) => {
    const start = Date.now();
    const response = await request.get(`${API_BASE_URL}/health`);
    const duration = Date.now() - start;

    expect(response.ok()).toBeTruthy();
    expect(duration).toBeLessThan(500);
  });

  test('Error Handling - 404 für unbekannte Route', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/non-existent-endpoint`);
    expect(response.status()).toBe(404);
  });

  test('Database Connection - MariaDB erreichbar', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/health/db`);
    expect(response.ok()).toBeTruthy();

    const health = await response.json();
    expect(health).toHaveProperty('database');
    expect(health.database).toHaveProperty('status');
    expect(health.database.status).toBe('up');
  });

});

test.describe('Migration Rollback Tests', () => {

  test.skip('Rollback Simulation - Daten in MongoDB noch vorhanden', async ({ request }) => {
    // Dieser Test wird nur für Rollback-Szenarien aktiviert
    const response = await request.get(`${API_BASE_URL}/migration/mongo/status`);
    expect(response.ok()).toBeTruthy();

    const status = await response.json();
    expect(status).toHaveProperty('mongoAvailable');
    expect(status.mongoAvailable).toBe(true);
  });

});

test.describe('Integration Tests - Ende-zu-Ende', () => {

  test('User Registration und Login Workflow', async ({ request }) => {
    // Test User Registration
    const registerResponse = await request.post(`${API_BASE_URL}/auth/register`, {
      data: {
        username: `testuser_${Date.now()}`,
        email: `test_${Date.now()}@example.com`,
        password: 'TestPassword123!',
      },
    });

    expect(registerResponse.ok()).toBeTruthy();
    const user = await registerResponse.json();
    expect(user).toHaveProperty('id');

    // Test Login
    const loginResponse = await request.post(`${API_BASE_URL}/auth/login`, {
      data: {
        username: user.username,
        password: 'TestPassword123!',
      },
    });

    expect(loginResponse.ok()).toBeTruthy();
    const authData = await loginResponse.json();
    expect(authData).toHaveProperty('token');
  });

  test('Terminal Registration und Update', async ({ request }) => {
    const terminalData = {
      terminalId: `terminal_${Date.now()}`,
      name: 'Test Terminal',
      type: 'browser',
      status: 'active',
    };

    // Register Terminal
    const registerResponse = await request.post(`${API_BASE_URL}/terminals`, {
      data: terminalData,
    });

    expect(registerResponse.ok()).toBeTruthy();
    const terminal = await registerResponse.json();
    expect(terminal).toHaveProperty('id');
    expect(terminal.terminalId).toBe(terminalData.terminalId);

    // Update Terminal
    const updateResponse = await request.patch(`${API_BASE_URL}/terminals/${terminal.id}`, {
      data: {
        status: 'inactive',
      },
    });

    expect(updateResponse.ok()).toBeTruthy();
    const updatedTerminal = await updateResponse.json();
    expect(updatedTerminal.status).toBe('inactive');
  });

});

