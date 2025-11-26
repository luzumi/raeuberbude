#!/usr/bin/env node

/**
 * LLM Benchmark Script
 *
 * Testet verschiedene Modelle und Konfigurationen gegen eine Liste von Beispiel-Eingaben
 * und misst p50/p90/p99 Latenz sowie Genauigkeit.
 *
 * Usage:
 *   node llm_benchmark.js
 *   node llm_benchmark.js --model mistralai/mistral-7b-instruct-v0.3
 *   node llm_benchmark.js --samples 100 --iterations 3
 */

import fetch from 'node-fetch';
import { readFileSync } from 'fs';

// Configuration
const CONFIG = {
  lmStudioUrl: process.env.LLM_URL || 'http://192.168.56.1:1234/v1/chat/completions',
  model: process.argv.find(arg => arg.startsWith('--model='))?.split('=')[1] ||
         process.env.LLM_MODEL ||
         'mistralai/mistral-7b-instruct-v0.3',
  samples: parseInt(process.argv.find(arg => arg.startsWith('--samples='))?.split('=')[1] || '50'),
  iterations: parseInt(process.argv.find(arg => arg.startsWith('--iterations='))?.split('=')[1] || '1'),
  temperature: 0.3,
  maxTokens: 500
};

// Test samples - diverse German commands and queries
const TEST_SAMPLES = [
  { text: "Schalte das Licht ein", expected: "home_assistant_command" },
  { text: "Mach die Lampe im Wohnzimmer aus", expected: "home_assistant_command" },
  { text: "Ist das Licht an?", expected: "home_assistant_query" },
  { text: "Zeige mir den Samsung TV", expected: "navigation" },
  { text: "Öffne Dashboard", expected: "navigation" },
  { text: "Wie hat Werder Bremen heute gespielt?", expected: "web_search" },
  { text: "Wetter morgen", expected: "web_search" },
  { text: "Hallo", expected: "greeting" },
  { text: "Guten Morgen", expected: "greeting" },
  { text: "Wie spät ist es?", expected: "general_question" },
  { text: "Stelle Heizung auf 22 Grad", expected: "home_assistant_command" },
  { text: "Spiele Musik ab", expected: "home_assistant_command" },
  { text: "Stopp", expected: "home_assistant_command" },
  { text: "Fernseher an", expected: "home_assistant_command" },
  { text: "Status Wohnzimmer", expected: "home_assistant_query" },
  { text: "qwertzuiop", expected: "unknown" }, // Nonsense
  { text: "asdf jklö", expected: "unknown" }, // Nonsense
];

// System prompt (same as in service)
const SYSTEM_PROMPT = `Du bist ein intelligenter Intent-Classifier für ein Smart Home System auf Deutsch.
Deine Aufgaben:
1. Validiere ob die Spracheingabe sinnvoll ist
2. Erkenne die ABSICHT (Intent) des Benutzers
3. Extrahiere relevante Informationen

Antworte NUR mit einem JSON-Objekt (keine zusätzlichen Erklärungen):
{
  "isValid": true/false,
  "confidence": 0.0-1.0,
  "hasAmbiguity": true/false,
  "clarificationNeeded": true/false,
  "clarificationQuestion": "Rückfrage oder null",
  "intent": {
    "type": "home_assistant_command|home_assistant_query|navigation|web_search|greeting|general_question|unknown",
    "summary": "Kurze Beschreibung",
    "keywords": ["Wort1", "Wort2"]
  }
}`;

// Benchmark function
async function benchmarkSample(sample, sttConfidence = 0.85) {
  const startTime = Date.now();

  try {
    const userPrompt = `STT-Confidence: ${(sttConfidence * 100).toFixed(0)}%
Transkript: "${sample.text}"

Validiere diese Spracheingabe.`;

    const combinedPrompt = `${SYSTEM_PROMPT}\n\n---\n\n${userPrompt}`;

    const response = await fetch(CONFIG.lmStudioUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: CONFIG.model,
        messages: [{ role: 'user', content: combinedPrompt }],
        temperature: CONFIG.temperature,
        max_tokens: CONFIG.maxTokens,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('No JSON in response');
    }

    const result = JSON.parse(jsonMatch[0]);
    const duration = Date.now() - startTime;

    return {
      duration,
      success: true,
      correct: result.intent?.type === sample.expected,
      result
    };
  } catch (error) {
    return {
      duration: Date.now() - startTime,
      success: false,
      correct: false,
      error: error.message
    };
  }
}

// Calculate percentiles
function percentile(arr, p) {
  const sorted = arr.slice().sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[index] || 0;
}

// Main benchmark
async function runBenchmark() {
  console.log('\n🚀 LLM Benchmark\n');
  console.log(`Model: ${CONFIG.model}`);
  console.log(`Samples: ${CONFIG.samples}`);
  console.log(`Iterations: ${CONFIG.iterations}`);
  console.log(`URL: ${CONFIG.lmStudioUrl}\n`);

  const allResults = [];
  let totalCorrect = 0;
  let totalSuccess = 0;

  // Run benchmark
  for (let iter = 0; iter < CONFIG.iterations; iter++) {
    console.log(`\n📊 Iteration ${iter + 1}/${CONFIG.iterations}`);

    for (let i = 0; i < Math.min(CONFIG.samples, TEST_SAMPLES.length); i++) {
      const sample = TEST_SAMPLES[i % TEST_SAMPLES.length];
      process.stdout.write(`  [${i + 1}/${CONFIG.samples}] "${sample.text.substring(0, 30)}..." `);

      const result = await benchmarkSample(sample);
      allResults.push(result);

      if (result.success) {
        totalSuccess++;
        if (result.correct) totalCorrect++;
        process.stdout.write(`✅ ${result.duration}ms\n`);
      } else {
        process.stdout.write(`❌ ${result.error}\n`);
      }
    }
  }

  // Calculate statistics
  const durations = allResults.filter(r => r.success).map(r => r.duration);
  const p50 = percentile(durations, 50);
  const p90 = percentile(durations, 90);
  const p99 = percentile(durations, 99);
  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
  const successRate = (totalSuccess / allResults.length) * 100;
  const accuracy = (totalCorrect / totalSuccess) * 100;

  // Print results
  console.log('\n\n📈 Results\n');
  console.log('─'.repeat(50));
  console.log(`Total Requests:    ${allResults.length}`);
  console.log(`Successful:        ${totalSuccess} (${successRate.toFixed(1)}%)`);
  console.log(`Correct Intent:    ${totalCorrect} (${accuracy.toFixed(1)}%)`);
  console.log('');
  console.log('Latency:');
  console.log(`  Average:         ${avg.toFixed(0)} ms`);
  console.log(`  p50 (median):    ${p50} ms`);
  console.log(`  p90:             ${p90} ms`);
  console.log(`  p99:             ${p99} ms`);
  console.log(`  Min:             ${Math.min(...durations)} ms`);
  console.log(`  Max:             ${Math.max(...durations)} ms`);
  console.log('─'.repeat(50));

  // Performance rating
  console.log('\n🎯 Performance Rating:\n');
  if (p90 < 500) {
    console.log('  🟢 EXCELLENT - p90 < 500ms');
  } else if (p90 < 1000) {
    console.log('  🟡 GOOD - p90 < 1000ms');
  } else if (p90 < 2000) {
    console.log('  🟠 ACCEPTABLE - p90 < 2000ms');
  } else {
    console.log('  🔴 NEEDS IMPROVEMENT - p90 > 2000ms');
  }

  if (accuracy > 90) {
    console.log('  🟢 EXCELLENT ACCURACY - >90%');
  } else if (accuracy > 80) {
    console.log('  🟡 GOOD ACCURACY - >80%');
  } else {
    console.log('  🔴 LOW ACCURACY - <80%');
  }

  console.log('\n✅ Benchmark complete!\n');
}

// Run
runBenchmark().catch(err => {
  console.error('\n❌ Benchmark failed:', err);
  process.exit(1);
});

