#!/usr/bin/env node

/**
 * Test Sampling Parameters
 *
 * Testet ob LM Studio die Sampling-Parameter wirklich anwendet
 */

import fetch from 'node-fetch';
import mongoose from 'mongoose';

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/logging';

// Test verschiedene Sampling-Konfigurationen
const TEST_CONFIGS = [
  {
    name: 'Default (keine extra Parameter)',
    params: {
      temperature: 0.3,
      max_tokens: 100
    }
  },
  {
    name: 'Mit Top-K = 10 (sehr restrictiv)',
    params: {
      temperature: 0.3,
      max_tokens: 100,
      top_k: 10  // Sehr klein - sollte unterschiedliche Ergebnisse geben
    }
  },
  {
    name: 'Mit Top-K = 100 (sehr permissiv)',
    params: {
      temperature: 0.3,
      max_tokens: 100,
      top_k: 100  // Sehr groß - andere Ergebnisse
    }
  },
  {
    name: 'Mit Top-P = 0.1 (sehr restrictiv)',
    params: {
      temperature: 0.3,
      max_tokens: 100,
      top_p: 0.1
    }
  },
  {
    name: 'Mit Top-P = 0.99 (sehr permissiv)',
    params: {
      temperature: 0.3,
      max_tokens: 100,
      top_p: 0.99
    }
  },
  {
    name: 'Mit Repeat Penalty = 2.0 (stark)',
    params: {
      temperature: 0.3,
      max_tokens: 100,
      repeat_penalty: 2.0  // Sehr hoch - sollte Wiederholungen vermeiden
    }
  },
  {
    name: 'Alle Parameter aus DB',
    params: null  // Wird aus DB geladen
  }
];

const TEST_PROMPT = 'Schalte das Licht im Wohnzimmer ein';

async function getActiveInstance() {
  await mongoose.connect(MONGO_URI);
  const LlmInstance = mongoose.model('LlmInstance', new mongoose.Schema({}, { strict: false }), 'llminstances');
  const instance = await LlmInstance.findOne({ isActive: true });
  await mongoose.connection.close();
  return instance;
}

async function testConfig(config, instance) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Test: ${config.name}`);
  console.log(`${'='.repeat(60)}`);

  let params = config.params;

  // Wenn params null, aus DB laden
  if (!params) {
    console.log('Lade Parameter aus DB...');
    const dbConfig = instance.config || {};
    params = {
      temperature: dbConfig.temperature,
      max_tokens: dbConfig.maxTokens || 100,
      top_k: dbConfig.topK,
      top_p: dbConfig.topP,
      repeat_penalty: dbConfig.repeatPenalty,
      min_p: dbConfig.minPSampling,
    };
  }

  // Entferne undefined Werte
  Object.keys(params).forEach(key => {
    if (params[key] === undefined) delete params[key];
  });

  console.log('Gesendete Parameter:', JSON.stringify(params, null, 2));

  const requestBody = {
    model: instance.model,
    messages: [
      { role: 'user', content: TEST_PROMPT }
    ],
    stream: false,
    ...params
  };

  try {
    const startTime = Date.now();
    const response = await fetch(instance.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const duration = Date.now() - startTime;
    const content = data.choices?.[0]?.message?.content || '';

    console.log(`\n✅ Antwort (${duration}ms):`);
    console.log(content.substring(0, 200) + (content.length > 200 ? '...' : ''));

    if (data.usage) {
      console.log(`\nToken-Usage:`, data.usage);
    }

    return {
      success: true,
      content,
      duration,
      usage: data.usage
    };

  } catch (error) {
    console.error(`\n❌ Fehler:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

async function main() {
  console.log('🔍 LM Studio Sampling-Parameter Test\n');

  // Aktive Instanz laden
  console.log('Lade aktive LLM-Instanz aus DB...');
  const instance = await getActiveInstance();

  if (!instance) {
    console.error('❌ Keine aktive LLM-Instanz gefunden!');
    process.exit(1);
  }

  console.log(`✅ Instanz gefunden: ${instance.model} @ ${instance.url}`);
  console.log(`Config in DB:`, JSON.stringify(instance.config, null, 2));

  // Warte 2 Sekunden
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Teste alle Konfigurationen
  const results = [];
  for (const config of TEST_CONFIGS) {
    const result = await testConfig(config, instance);
    results.push({ config: config.name, ...result });

    // Pause zwischen Tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Zusammenfassung
  console.log(`\n${'='.repeat(60)}`);
  console.log('ZUSAMMENFASSUNG');
  console.log(`${'='.repeat(60)}`);

  for (const result of results) {
    const status = result.success ? '✅' : '❌';
    const time = result.duration ? `${result.duration}ms` : 'N/A';
    console.log(`${status} ${result.config.padEnd(40)} ${time}`);
  }

  console.log('\n💡 WICHTIG: Vergleiche die Antworten!');
  console.log('   Wenn die Parameter funktionieren, sollten sich die Antworten');
  console.log('   zwischen den verschiedenen Konfigurationen unterscheiden.');
  console.log('   Besonders Top-K=10 vs Top-K=100 sollten unterschiedlich sein.\n');
}

main().catch(console.error);

