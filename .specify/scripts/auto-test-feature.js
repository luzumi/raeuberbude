/**
 * Automatisierter Feature-Test mit Puppeteer
 *
 * Läuft komplett automatisch:
 * 1. Startet Dev-Server
 * 2. Öffnet Browser
 * 3. Führt Tests durch
 * 4. Sammelt Logs & Screenshots
 * 5. Stoppt Server
 * 6. Generiert Report
 *
 * KEIN USER-INPUT ERFORDERLICH!
 */

const puppeteer = require('puppeteer');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

class AutoTestRunner {
  constructor(config) {
    this.config = config;
    this.devServer = null;
    this.browser = null;
    this.page = null;
    this.results = {
      passed: [],
      failed: [],
      logs: [],
      screenshots: []
    };
  }

  async checkServerHealth() {
    try {
      const http = require('node:http');
      return new Promise((resolve) => {
        const req = http.get('http://localhost:4200', (res) => {
          resolve(res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
        req.setTimeout(2000, () => {
          req.destroy();
          resolve(false);
        });
      });
    } catch (e) {
      console.warn(e.message)
    }
      return false;
    }
  }

  async startDevServer() {
    console.log('🚀 Prüfe Dev-Server...');

    // Prüfe ob Server bereits läuft
    const isRunning = await this.checkServerHealth();
    if (isRunning) {
      console.log('✅ Dev-Server läuft bereits auf http://localhost:4200');
      return;
    }

    console.log('📡 Server läuft nicht - starte automatisch...');
    console.log('   (Dies dauert ca. 30-60 Sekunden)');
    console.log('');

    return new Promise((resolve, reject) => {
      this.devServer = spawn('npm', ['start'], {
        shell: true,
        stdio: 'pipe'
      });

      let output = '';
      let resolved = false;

      this.devServer.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;

        // Logge Fortschritt
        if (text.includes('%')) {
          process.stdout.write('.');
        }

        // Warte auf "compiled successfully" oder "Local: http://localhost:4200"
        if (!resolved && (
          text.includes('compiled successfully') ||
          text.includes('Compiled successfully') ||
          text.includes('Local:') ||
          text.includes('localhost:4200')
        )) {
          resolved = true;
          console.log('\n✅ Dev-Server bereit auf http://localhost:4200');
          // Warte noch 3 Sekunden zur Sicherheit
          setTimeout(() => resolve(), 3000);
        }
      });

      this.devServer.stderr.on('data', (data) => {
        const text = data.toString();
        // Ignoriere Warnings, nur echte Errors loggen
        if (text.includes('ERROR')) {
          console.error('Dev-Server Error:', text);
        }
      });

      // Timeout nach 60 Sekunden
      setTimeout(() => {
        if (!resolved) {
          console.log('\n⚠️ Timeout nach 60s - versuche trotzdem...');
          resolved = true;
          resolve();
        }
      }, 60000);
    });
  }

  async startBrowser() {
    console.log('🌐 Öffne Browser...');

    this.browser = await puppeteer.launch({
      headless: true, // Im Hintergrund
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    this.page = await this.browser.newPage();

    // Console-Logs sammeln
    this.page.on('console', msg => {
      this.results.logs.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date().toISOString()
      });
    });

    // Fehler sammeln
    this.page.on('pageerror', error => {
      this.results.logs.push({
        type: 'error',
        text: error.message,
        timestamp: new Date().toISOString()
      });
    });

    console.log('✅ Browser geöffnet');
  }

  async runTests() {
    console.log('🧪 Führe Tests durch...');

    const tests = this.config.tests || [];

    for (const test of tests) {
      try {
        console.log(`  ▶️  ${test.name}`);
        await this.runSingleTest(test);
        this.results.passed.push(test.name);
        console.log(`  ✅ ${test.name}`);
      } catch (error) {
        this.results.failed.push({
          name: test.name,
          error: error.message
        });
        console.log(`  ❌ ${test.name}: ${error.message}`);
      }
    }
  }


    async runSingleTest(test) {
        await this.navigateToPage(test);
        await this.takeScreenshotBefore(test);
        await this.waitForElement(test);
        await this.executeAction(test);
        await this.waitAfterAction(test);
        await this.takeScreenshotAfter(test);
        await this.performAssertion(test);
    }

    async navigateToPage(test) {
        if (test.navigate) {
            await this.page.goto(`http://localhost:4200${test.navigate}`, {
                waitUntil: 'networkidle0',
                timeout: 30000
            });
        }
    }

    async takeScreenshotBefore(test) {
        if (test.screenshotBefore) {
            const screenshotPath = `test-results/${test.name}-before.png`;
            await this.page.screenshot({path: screenshotPath});
            this.results.screenshots.push(screenshotPath);
        }
    }

    async waitForElement(test) {
        if (test.waitFor) {
            await this.page.waitForSelector(test.waitFor, {timeout: 10000});
        }
    }

    async executeAction(test) {
        if (test.action === 'click') {
            await this.page.click(test.selector);
        } else if (test.action === 'type') {
            await this.page.type(test.selector, test.value);
        } else if (test.action === 'longPress') {
            await this.performLongPress(test);
        }
    }

    async performLongPress(test) {
        await this.page.hover(test.selector);
        await this.page.mouse.down();
        await this.page.waitForTimeout(test.duration || 600);
        await this.page.mouse.up();
    }

    async waitAfterAction(test) {
        if (test.waitAfter) {
            await this.page.waitForTimeout(test.waitAfter);
        }
    }

    async takeScreenshotAfter(test) {
        if (test.screenshotAfter) {
            const screenshotPath = `test-results/${test.name}-after.png`;
            await this.page.screenshot({path: screenshotPath});
            this.results.screenshots.push(screenshotPath);
        }
    }

    async performAssertion(test) {
        if (!test.expect) return;

        const element = await this.page.$(test.expect.selector);

        if (test.expect.type === 'visible') {
            await this.assertElementVisible(element, test.expect.selector);
        } else if (test.expect.type === 'hasClass') {
            await this.assertElementHasClass(element, test.expect.value);
        } else if (test.expect.type === 'text') {
            await this.assertElementContainsText(element, test.expect.value);
        }
    }

    async assertElementVisible(element, selector) {
        if (!element) {
            throw new Error(`Element ${selector} nicht gefunden`);
        }
    }

    async assertElementHasClass(element, expectedClass) {
        const className = await element.evaluate(el => el.className);
        if (!className.includes(expectedClass)) {
            throw new Error(`Element hat nicht Klasse ${expectedClass}`);
        }
    }

    async assertElementContainsText(element, expectedText) {
        const text = await element.evaluate(el => el.textContent);
        if (!text.includes(expectedText)) {
            throw new Error(`Text enthält nicht "${expectedText}"`);
        }
    }

  async analyzeConsoleLogs() {
    console.log('\n📋 Analysiere Console-Logs...');

    const errors = this.results.logs.filter(log => log.type === 'error');
    const warnings = this.results.logs.filter(log => log.type === 'warning');
    const criticalLogs = this.results.logs.filter(log =>
      log.text.includes('❌') ||
      log.text.includes('FAILED') ||
      log.text.includes('WebSocket NOT connected')
    );

    console.log(`  - Errors: ${errors.length}`);
    console.log(`  - Warnings: ${warnings.length}`);
    console.log(`  - Critical: ${criticalLogs.length}`);

    if (errors.length > 0) {
      console.log('\n⚠️ Gefundene Fehler:');
      for (const err of errors) {
        console.log(`  - ${err.text}`);
      }
    }

    return {
      errors: errors.length,
      warnings: warnings.length,
      critical: criticalLogs.length,
      details: { errors, warnings, criticalLogs }
    };
  }

  async generateReport() {
    console.log('\n📊 Generiere Test-Report...');

    const logAnalysis = await this.analyzeConsoleLogs();

    const totalTests = this.results.passed.length + this.results.failed.length;
    const passRate = totalTests > 0 ? Math.round((this.results.passed.length / totalTests) * 100) : 0;

    const report = {
      timestamp: new Date().toISOString(),
      feature: this.config.feature,
      totalTests: totalTests,
      passed: this.results.passed.length,
      failed: this.results.failed.length,
      passRate: passRate,
      passedTests: this.results.passed,  // Array von Test-Namen
      failedTests: this.results.failed,  // Array von {name, error}
      logAnalysis,
      screenshots: this.results.screenshots
    };

    // Report als JSON speichern
    const reportPath = 'test-results/auto-test-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Markdown-Report
    const mdReport = this.generateMarkdownReport(report);
    fs.writeFileSync('test-results/auto-test-report.md', mdReport);

    return report;
  }

  generateMarkdownReport(report) {
    return `# 🧪 Automatischer Test-Report

**Feature:** ${report.feature}
**Datum:** ${new Date(report.timestamp).toLocaleString('de-DE')}

---

## 📊 Testergebnisse

| Metrik | Wert |
|--------|------|
| **Gesamt** | ${report.totalTests} Tests |
| **✅ Bestanden** | ${report.passed} |
| **❌ Fehlgeschlagen** | ${report.failed} |
| **Pass-Rate** | ${report.passRate}% |

---

## 📋 Console-Log-Analyse

- **Errors:** ${report.logAnalysis.errors}
- **Warnings:** ${report.logAnalysis.warnings}
- **Critical:** ${report.logAnalysis.critical}

${report.logAnalysis.errors > 0 ? `
### ⚠️ Gefundene Fehler

${report.logAnalysis.details.errors.map(e => `- \`${e.text}\``).join('\n')}
` : ''}

---

## 📸 Screenshots

${report.screenshots.length > 0 ? report.screenshots.map(s => `- ${path.basename(s)}`).join('\n') : '_(keine Screenshots)_'}

---

## 🧪 Test-Details

### ✅ Bestandene Tests
${report.passedTests && report.passedTests.length > 0 ? report.passedTests.map(t => `- ${t}`).join('\n') : `_(${report.passed} Tests bestanden)_`}

${report.failedTests && report.failedTests.length > 0 ? `
### ❌ Fehlgeschlagene Tests
${report.failedTests.map(t => `- **${t.name}**: ${t.error}`).join('\n')}
` : ''}

---

## 🎯 Fazit

${report.failed === 0 && report.logAnalysis.errors === 0
  ? '✅ **Alle Tests bestanden! Feature ist bereit für PR.**'
  : `⚠️ **${report.failed} Test(s) fehlgeschlagen oder ${report.logAnalysis.errors} Console-Errors gefunden. Bugfixes erforderlich.**`}
`;
  }

  async cleanup() {
    console.log('\n🧹 Aufräumen...');

    if (this.browser) {
      await this.browser.close();
      console.log('  ✅ Browser geschlossen');
    }

    if (this.devServer) {
      this.devServer.kill();
      console.log('  ✅ Dev-Server gestoppt');
    }
  }

  async run() {
    try {
      // Erstelle test-results Ordner
      if (!fs.existsSync('test-results')) {
        fs.mkdirSync('test-results', { recursive: true });
      }

      await this.startDevServer();
      await this.startBrowser();
      await this.runTests();
      const report = await this.generateReport();

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ Automatischer Test abgeschlossen!');
      console.log(`📊 ${report.passed}/${report.totalTests} Tests bestanden (${report.passRate}%)`);
      console.log(`📋 ${report.logAnalysis.errors} Console-Errors`);
      console.log(`📸 ${report.screenshots.length} Screenshots erstellt`);
      console.log('📁 Report: test-results/auto-test-report.md');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      return report;

    } catch (error) {
      console.error('❌ Test-Fehler:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// Export für Verwendung in anderen Scripts
module.exports = AutoTestRunner;

// CLI-Verwendung
if (require.main === module) {
  const configFile = process.argv[2];
  let config;

  if (configFile && fs.existsSync(configFile)) {
    config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
  } else {
    const issueId = process.argv[3] || process.env.ISSUE_ID || process.env.AUTO_TEST_ISSUE_ID || 'UNKNOWN';
    console.log(`ℹ️  Keine gültige Config-Datei angegeben. Starte mit Default-Konfiguration${issueId !== 'UNKNOWN' ? ' für ' + issueId : ''}...`);
    config = {
      feature: `Auto Smoke Test${issueId !== 'UNKNOWN' ? ' - ' + issueId : ''}`,
      issueId,
      tests: [
        {
          name: 'App loads',
          navigate: '/',
          waitFor: 'body',
          screenshotAfter: true,
          expect: { selector: 'body', type: 'visible' }
        }
      ]
    };
  }

  const runner = new AutoTestRunner(config);
  runner.run()
    .then(report => {
      if (!report) {
        console.error('❌ Kein Test-Report erhalten');
        process.exit(1);
        return;
      }

      const hasFailedTests = (report.failed || 0) > 0;
      const hasLogErrors = (report.logAnalysis?.errors || 0) > 0;

      console.log(`📊 Tests: ${hasFailedTests ? 'FAILED' : 'PASSED'}`);
      console.log(`📋 Logs: ${hasLogErrors ? 'ERRORS' : 'CLEAN'}`);

      process.exit(hasFailedTests || hasLogErrors ? 1 : 0);
    })
    .catch(error => {
      console.error('❌ Fatal error:', error.message || error);
      process.exit(1);
    });
}
