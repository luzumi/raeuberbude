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

  async startDevServer() {
    console.log('🚀 Starte Dev-Server...');
    
    return new Promise((resolve, reject) => {
      this.devServer = spawn('npm', ['start'], {
        shell: true,
        stdio: 'pipe'
      });

      let output = '';
      
      this.devServer.stdout.on('data', (data) => {
        output += data.toString();
        // Warte auf "compiled successfully"
        if (output.includes('compiled successfully') || output.includes('Compiled successfully')) {
          console.log('✅ Dev-Server bereit');
          resolve();
        }
      });

      this.devServer.stderr.on('data', (data) => {
        console.error('Dev-Server Error:', data.toString());
      });

      // Timeout nach 30 Sekunden
      setTimeout(() => {
        if (!output.includes('compiled successfully')) {
          console.log('⚠️ Timeout - gehe davon aus Server läuft');
          resolve();
        }
      }, 30000);
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
    // Navigation
    if (test.navigate) {
      await this.page.goto(`http://localhost:4200${test.navigate}`, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });
    }

    // Screenshot vor Aktion
    if (test.screenshotBefore) {
      const screenshotPath = `test-results/${test.name}-before.png`;
      await this.page.screenshot({ path: screenshotPath });
      this.results.screenshots.push(screenshotPath);
    }

    // Warte auf Element
    if (test.waitFor) {
      await this.page.waitForSelector(test.waitFor, { timeout: 10000 });
    }

    // Aktion durchführen
    if (test.action === 'click') {
      await this.page.click(test.selector);
    } else if (test.action === 'type') {
      await this.page.type(test.selector, test.value);
    } else if (test.action === 'longPress') {
      await this.page.hover(test.selector);
      await this.page.mouse.down();
      await this.page.waitForTimeout(test.duration || 600);
      await this.page.mouse.up();
    }

    // Warte auf Ergebnis
    if (test.waitAfter) {
      await this.page.waitForTimeout(test.waitAfter);
    }

    // Screenshot nach Aktion
    if (test.screenshotAfter) {
      const screenshotPath = `test-results/${test.name}-after.png`;
      await this.page.screenshot({ path: screenshotPath });
      this.results.screenshots.push(screenshotPath);
    }

    // Assertion
    if (test.expect) {
      const element = await this.page.$(test.expect.selector);
      
      if (test.expect.type === 'visible') {
        if (!element) throw new Error(`Element ${test.expect.selector} nicht gefunden`);
      } else if (test.expect.type === 'hasClass') {
        const className = await element.evaluate(el => el.className);
        if (!className.includes(test.expect.value)) {
          throw new Error(`Element hat nicht Klasse ${test.expect.value}`);
        }
      } else if (test.expect.type === 'text') {
        const text = await element.evaluate(el => el.textContent);
        if (!text.includes(test.expect.value)) {
          throw new Error(`Text enthält nicht "${test.expect.value}"`);
        }
      }
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
      errors.forEach(err => console.log(`  - ${err.text}`));
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
    
    const report = {
      timestamp: new Date().toISOString(),
      feature: this.config.feature,
      totalTests: this.results.passed.length + this.results.failed.length,
      passed: this.results.passed.length,
      failed: this.results.failed.length,
      passRate: Math.round((this.results.passed.length / (this.results.passed.length + this.results.failed.length)) * 100),
      logAnalysis,
      screenshots: this.results.screenshots,
      failedTests: this.results.failed
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

${report.screenshots.map(s => `- ${path.basename(s)}`).join('\n')}

---

## 🧪 Test-Details

### ✅ Bestandene Tests
${report.passed.map(t => `- ${t}`).join('\n') || '_(keine)_'}

${report.failedTests.length > 0 ? `
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
  const configFile = process.argv[2] || 'test-config.json';
  
  if (!fs.existsSync(configFile)) {
    console.error(`❌ Config-Datei nicht gefunden: ${configFile}`);
    process.exit(1);
  }
  
  const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
  
  const runner = new AutoTestRunner(config);
  runner.run()
    .then(report => {
      process.exit(report.failed === 0 && report.logAnalysis.errors === 0 ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
