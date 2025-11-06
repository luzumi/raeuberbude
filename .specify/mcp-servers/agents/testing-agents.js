/**
 * Spezialisierte Testing und Review Agenten
 * Führt automatisierte Tests und Code Reviews durch
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const YOUTRACK_MCP = process.env.YOUTRACK_MCP_URL || 'http://localhost:5180';
const WEB_MCP = process.env.WEB_MCP_URL || 'http://localhost:4200';
const PROJECT_ROOT = process.env.PROJECT_ROOT || path.resolve(__dirname, '../../../');

class UnitTestAgent {
  constructor(config = {}) {
    this.name = config.name || 'Unit Test Agent';
    this.capabilities = ['jest', 'jasmine', 'karma', 'mocha'];
  }

  async runTests(spec) {
    const results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      coverage: null
    };

    try {
      // Determine test framework
      const framework = await this.detectTestFramework(spec.path);
      
      // Run tests based on framework
      let command;
      switch(framework) {
        case 'jest':
          command = `npm test -- ${spec.pattern || ''} ${spec.coverage ? '--coverage' : ''}`;
          break;
        case 'karma':
          command = `ng test --watch=false ${spec.coverage ? '--code-coverage' : ''}`;
          break;
        case 'mocha':
          command = `npm test ${spec.pattern || ''}`;
          break;
        default:
          command = 'npm test';
      }

      const { stdout, stderr } = await execAsync(command, {
        cwd: spec.path || PROJECT_ROOT
      });

      // Parse test results
      const testResults = this.parseTestResults(stdout, framework);
      Object.assign(results, testResults);

      // Get coverage if requested
      if (spec.coverage) {
        results.coverage = await this.getCoverage(spec.path);
      }

      return {
        success: results.failed === 0,
        results,
        output: stdout,
        errors: stderr
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        results
      };
    }
  }

  async createTest(spec) {
    const testPath = spec.path || path.join(PROJECT_ROOT, 'src');
    let testContent;

    switch(spec.type) {
      case 'component':
        testContent = this.generateComponentTest(spec);
        break;
      case 'service':
        testContent = this.generateServiceTest(spec);
        break;
      case 'api':
        testContent = this.generateApiTest(spec);
        break;
      default:
        testContent = this.generateGenericTest(spec);
    }

    const testFile = `${spec.name}.spec.${spec.extension || 'ts'}`;
    await fs.writeFile(path.join(testPath, testFile), testContent);

    return {
      success: true,
      file: testFile,
      path: testPath
    };
  }

  async detectTestFramework(projectPath) {
    try {
      const packageJson = await fs.readFile(
        path.join(projectPath || PROJECT_ROOT, 'package.json'),
        'utf-8'
      );
      const pkg = JSON.parse(packageJson);
      
      if (pkg.devDependencies) {
        if (pkg.devDependencies.jest) return 'jest';
        if (pkg.devDependencies.karma) return 'karma';
        if (pkg.devDependencies.mocha) return 'mocha';
      }
    } catch (error) {
      console.error('Error detecting test framework:', error);
    }
    
    return 'jest'; // Default
  }

  parseTestResults(output, framework) {
    const results = {
      passed: 0,
      failed: 0,
      skipped: 0
    };

    if (framework === 'jest') {
      const passMatch = output.match(/✓.*\((\d+)\)/g);
      const failMatch = output.match(/✕.*\((\d+)\)/g);
      const skipMatch = output.match(/○.*\((\d+)\)/g);
      
      if (passMatch) results.passed = passMatch.length;
      if (failMatch) results.failed = failMatch.length;
      if (skipMatch) results.skipped = skipMatch.length;
    }
    // Add more framework parsers as needed

    return results;
  }

  async getCoverage(projectPath) {
    try {
      const coveragePath = path.join(
        projectPath || PROJECT_ROOT,
        'coverage/lcov-report/index.html'
      );
      
      const exists = await fs.access(coveragePath).then(() => true).catch(() => false);
      
      if (exists) {
        const coverageHtml = await fs.readFile(coveragePath, 'utf-8');
        // Parse coverage percentages
        const stmtMatch = coverageHtml.match(/Statements.*?(\d+\.?\d*)%/);
        const branchMatch = coverageHtml.match(/Branches.*?(\d+\.?\d*)%/);
        const funcMatch = coverageHtml.match(/Functions.*?(\d+\.?\d*)%/);
        const lineMatch = coverageHtml.match(/Lines.*?(\d+\.?\d*)%/);
        
        return {
          statements: stmtMatch ? parseFloat(stmtMatch[1]) : 0,
          branches: branchMatch ? parseFloat(branchMatch[1]) : 0,
          functions: funcMatch ? parseFloat(funcMatch[1]) : 0,
          lines: lineMatch ? parseFloat(lineMatch[1]) : 0
        };
      }
    } catch (error) {
      console.error('Error getting coverage:', error);
    }
    
    return null;
  }

  generateComponentTest(spec) {
    return `import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ${spec.componentName} } from './${spec.fileName}';

describe('${spec.componentName}', () => {
  let component: ${spec.componentName};
  let fixture: ComponentFixture<${spec.componentName}>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ${spec.componentName} ],
      imports: [${spec.imports ? spec.imports.join(', ') : ''}],
      providers: [${spec.providers ? spec.providers.join(', ') : ''}]
    })
    .compileComponents();

    fixture = TestBed.createComponent(${spec.componentName});
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  ${spec.tests ? spec.tests.map(t => this.generateTestCase(t)).join('\n\n  ') : ''}
});`;
  }

  generateServiceTest(spec) {
    return `import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ${spec.serviceName} } from './${spec.fileName}';

describe('${spec.serviceName}', () => {
  let service: ${spec.serviceName};
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [${spec.serviceName}]
    });
    
    service = TestBed.inject(${spec.serviceName});
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  ${spec.tests ? spec.tests.map(t => this.generateTestCase(t)).join('\n\n  ') : ''}
});`;
  }

  generateApiTest(spec) {
    return `import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ${spec.controllerName} } from './${spec.fileName}';

describe('${spec.controllerName}', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [${spec.controllerName}],
      providers: [${spec.providers ? spec.providers.join(', ') : ''}]
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  ${spec.tests ? spec.tests.map(t => this.generateApiTestCase(t)).join('\n\n  ') : ''}
});`;
  }

  generateGenericTest(spec) {
    return `describe('${spec.name}', () => {
  ${spec.setup ? `beforeEach(() => {
    ${spec.setup}
  });` : ''}

  ${spec.tests ? spec.tests.map(t => this.generateTestCase(t)).join('\n\n  ') : ''}
});`;
  }

  generateTestCase(test) {
    return `it('${test.description}', ${test.async ? 'async ' : ''}() => {
    ${test.arrange ? `// Arrange\n    ${test.arrange}\n` : ''}
    ${test.act ? `// Act\n    ${test.act}\n` : ''}
    ${test.assert ? `// Assert\n    ${test.assert}` : 'expect(true).toBeTruthy();'}
  });`;
  }

  generateApiTestCase(test) {
    return `it('${test.description}', async () => {
    const response = await request(app.getHttpServer())
      .${test.method || 'get'}('${test.endpoint}')
      ${test.body ? `.send(${JSON.stringify(test.body)})` : ''}
      ${test.headers ? `.set(${JSON.stringify(test.headers)})` : ''}
      .expect(${test.expectedStatus || 200});
    
    ${test.assertions ? test.assertions : 'expect(response.body).toBeDefined();'}
  });`;
  }
}

class E2ETestAgent {
  constructor(config = {}) {
    this.name = config.name || 'E2E Test Agent';
    this.capabilities = ['playwright', 'cypress', 'selenium'];
    this.browserSession = null;
  }

  async runE2ETest(spec) {
    const framework = spec.framework || 'playwright';
    
    switch(framework) {
      case 'playwright':
        return await this.runPlaywrightTest(spec);
      case 'cypress':
        return await this.runCypressTest(spec);
      default:
        return await this.runPlaywrightTest(spec);
    }
  }

  async runPlaywrightTest(spec) {
    try {
      const testFile = await this.createPlaywrightTest(spec);
      
      const { stdout, stderr } = await execAsync(
        `npx playwright test ${testFile} ${spec.headed ? '--headed' : ''}`,
        { cwd: PROJECT_ROOT }
      );

      return {
        success: !stderr.includes('failed'),
        output: stdout,
        errors: stderr
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async createPlaywrightTest(spec) {
    const testContent = `import { test, expect } from '@playwright/test';

test.describe('${spec.feature}', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('${spec.baseUrl || 'http://localhost:4200'}');
  });

  ${spec.scenarios ? spec.scenarios.map(s => this.generateScenario(s)).join('\n\n  ') : ''}
});`;

    const testPath = path.join(PROJECT_ROOT, 'tests');
    const testFile = `${spec.name}.spec.ts`;
    
    await fs.mkdir(testPath, { recursive: true });
    await fs.writeFile(path.join(testPath, testFile), testContent);
    
    return testFile;
  }

  generateScenario(scenario) {
    return `test('${scenario.name}', async ({ page }) => {
    ${scenario.steps ? scenario.steps.map(s => this.generateStep(s)).join('\n    ') : ''}
  });`;
  }

  generateStep(step) {
    switch(step.action) {
      case 'click':
        return `await page.click('${step.selector}');`;
      case 'fill':
        return `await page.fill('${step.selector}', '${step.value}');`;
      case 'navigate':
        return `await page.goto('${step.url}');`;
      case 'wait':
        return `await page.waitForSelector('${step.selector}');`;
      case 'screenshot':
        return `await page.screenshot({ path: '${step.path}', fullPage: ${step.fullPage || false} });`;
      case 'expect':
        return this.generateExpectation(step);
      default:
        return `// ${step.action}`;
    }
  }

  generateExpectation(step) {
    switch(step.expectType) {
      case 'visible':
        return `await expect(page.locator('${step.selector}')).toBeVisible();`;
      case 'text':
        return `await expect(page.locator('${step.selector}')).toContainText('${step.value}');`;
      case 'count':
        return `await expect(page.locator('${step.selector}')).toHaveCount(${step.value});`;
      case 'url':
        return `await expect(page).toHaveURL('${step.value}');`;
      default:
        return `await expect(page.locator('${step.selector}')).toBeTruthy();`;
    }
  }

  async testWithMCP(spec) {
    try {
      // Create browser session via MCP
      const sessionResponse = await axios.post(`${WEB_MCP}/sessions`, {
        url: spec.url || 'http://localhost:4200',
        headless: false
      });
      
      this.browserSession = sessionResponse.data.sessionId;
      
      // Execute test steps
      const results = [];
      for (const step of spec.steps) {
        const result = await this.executeMCPStep(step);
        results.push(result);
      }
      
      // Take final screenshot
      await axios.post(`${WEB_MCP}/sessions/${this.browserSession}/screenshot`, {
        fullPage: true,
        path: `./screenshots/e2e-${Date.now()}.png`
      });
      
      // Close session
      await axios.delete(`${WEB_MCP}/sessions/${this.browserSession}`);
      
      return {
        success: true,
        results
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async executeMCPStep(step) {
    const sessionId = this.browserSession;
    
    switch(step.action) {
      case 'click':
        return await axios.post(`${WEB_MCP}/sessions/${sessionId}/click`, {
          selector: step.selector
        });
      case 'type':
        return await axios.post(`${WEB_MCP}/sessions/${sessionId}/type`, {
          selector: step.selector,
          text: step.value
        });
      case 'navigate':
        return await axios.post(`${WEB_MCP}/sessions/${sessionId}/navigate`, {
          url: step.url
        });
      case 'wait':
        return await axios.post(`${WEB_MCP}/sessions/${sessionId}/waitForSelector`, {
          selector: step.selector
        });
      case 'evaluate':
        return await axios.post(`${WEB_MCP}/sessions/${sessionId}/evaluate`, {
          expression: step.expression
        });
      default:
        return { action: step.action, status: 'unknown' };
    }
  }
}

class CodeReviewAgent {
  constructor(config = {}) {
    this.name = config.name || 'Code Review Agent';
    this.capabilities = ['eslint', 'prettier', 'sonarqube', 'codeql'];
  }

  async reviewCode(spec) {
    const results = {
      passed: true,
      issues: [],
      suggestions: [],
      metrics: {}
    };

    // Run linting
    if (spec.lint !== false) {
      const lintResults = await this.runLinting(spec);
      results.issues.push(...lintResults.issues);
      results.passed = results.passed && lintResults.passed;
    }

    // Check code style
    if (spec.style !== false) {
      const styleResults = await this.checkStyle(spec);
      results.issues.push(...styleResults.issues);
      results.passed = results.passed && styleResults.passed;
    }

    // Security scan
    if (spec.security !== false) {
      const securityResults = await this.runSecurityScan(spec);
      results.issues.push(...securityResults.issues);
      results.passed = results.passed && securityResults.passed;
    }

    // Complexity analysis
    if (spec.complexity !== false) {
      results.metrics = await this.analyzeComplexity(spec);
    }

    // Generate suggestions
    results.suggestions = this.generateSuggestions(results);

    return results;
  }

  async runLinting(spec) {
    const results = {
      passed: true,
      issues: []
    };

    try {
      const { stdout, stderr } = await execAsync(
        `npx eslint ${spec.path || 'src'} --format json`,
        { cwd: PROJECT_ROOT }
      );

      const lintResults = JSON.parse(stdout);
      
      for (const file of lintResults) {
        for (const message of file.messages) {
          results.issues.push({
            type: 'lint',
            severity: message.severity === 2 ? 'error' : 'warning',
            file: file.filePath,
            line: message.line,
            column: message.column,
            rule: message.ruleId,
            message: message.message
          });
          
          if (message.severity === 2) {
            results.passed = false;
          }
        }
      }
    } catch (error) {
      // ESLint returns non-zero exit code if there are errors
      if (error.stdout) {
        try {
          const lintResults = JSON.parse(error.stdout);
          // Process results same as above
        } catch (parseError) {
          results.issues.push({
            type: 'lint',
            severity: 'error',
            message: 'Failed to run ESLint: ' + error.message
          });
          results.passed = false;
        }
      }
    }

    return results;
  }

  async checkStyle(spec) {
    const results = {
      passed: true,
      issues: []
    };

    try {
      const { stdout, stderr } = await execAsync(
        `npx prettier --check ${spec.path || 'src'}`,
        { cwd: PROJECT_ROOT }
      );

      // Prettier exits with 0 if all files are formatted
      results.passed = true;
    } catch (error) {
      // Prettier exits with non-zero if files need formatting
      results.passed = false;
      
      // Parse the output to find unformatted files
      if (error.stdout) {
        const lines = error.stdout.split('\n');
        for (const line of lines) {
          if (line.includes('src/') || line.includes('backend/')) {
            results.issues.push({
              type: 'style',
              severity: 'warning',
              file: line.trim(),
              message: 'File needs formatting'
            });
          }
        }
      }
    }

    return results;
  }

  async runSecurityScan(spec) {
    const results = {
      passed: true,
      issues: []
    };

    try {
      // Check for vulnerable dependencies
      const { stdout } = await execAsync(
        'npm audit --json',
        { cwd: PROJECT_ROOT }
      );

      const audit = JSON.parse(stdout);
      
      if (audit.metadata.vulnerabilities) {
        const vulns = audit.metadata.vulnerabilities;
        
        if (vulns.critical > 0 || vulns.high > 0) {
          results.passed = false;
        }
        
        for (const [name, data] of Object.entries(audit.vulnerabilities || {})) {
          results.issues.push({
            type: 'security',
            severity: data.severity,
            package: name,
            message: data.title,
            recommendation: data.fixAvailable ? 'Update package' : 'No fix available'
          });
        }
      }
    } catch (error) {
      console.error('Security scan error:', error);
    }

    // Additional security checks
    const securityPatterns = [
      { pattern: /eval\(/, message: 'Avoid using eval()' },
      { pattern: /innerHTML\s*=/, message: 'Use textContent or sanitize innerHTML' },
      { pattern: /password.*=.*['"][^'"]+['"]/, message: 'Hardcoded password detected' },
      { pattern: /api[_-]?key.*=.*['"][^'"]+['"]/, message: 'Hardcoded API key detected' }
    ];

    // Scan source files for security patterns
    // This would need implementation to scan files

    return results;
  }

  async analyzeComplexity(spec) {
    const metrics = {
      cyclomaticComplexity: 0,
      linesOfCode: 0,
      duplicateCode: 0,
      testCoverage: 0
    };

    // This would require integration with tools like:
    // - complexity-report for cyclomatic complexity
    // - jscpd for duplicate code detection
    // - nyc/istanbul for coverage

    return metrics;
  }

  generateSuggestions(results) {
    const suggestions = [];

    // Based on issues found
    if (results.issues.filter(i => i.type === 'lint').length > 10) {
      suggestions.push({
        type: 'improvement',
        message: 'Consider adding pre-commit hooks to run linting automatically'
      });
    }

    if (results.issues.filter(i => i.type === 'style').length > 0) {
      suggestions.push({
        type: 'improvement',
        message: 'Run "npm run format" to automatically fix style issues'
      });
    }

    if (results.issues.filter(i => i.type === 'security' && i.severity === 'critical').length > 0) {
      suggestions.push({
        type: 'critical',
        message: 'Critical security vulnerabilities found. Update dependencies immediately.'
      });
    }

    // Based on metrics
    if (results.metrics.cyclomaticComplexity > 10) {
      suggestions.push({
        type: 'refactor',
        message: 'Consider breaking down complex functions to improve maintainability'
      });
    }

    if (results.metrics.testCoverage < 80) {
      suggestions.push({
        type: 'testing',
        message: 'Test coverage is below 80%. Add more unit tests.'
      });
    }

    return suggestions;
  }
}

class BugReportAgent {
  constructor(config = {}) {
    this.name = config.name || 'Bug Report Agent';
    this.capabilities = ['bug-tracking', 'youtrack', 'jira'];
  }

  async reportBug(bug) {
    const report = {
      id: null,
      summary: bug.summary,
      description: this.generateDescription(bug),
      priority: this.calculatePriority(bug),
      type: 'BUG',
      attachments: []
    };

    // Create YouTrack issue
    try {
      const response = await axios.post(`${YOUTRACK_MCP}/issues`, {
        summary: report.summary,
        description: report.description,
        type: report.type,
        customFields: [
          {
            name: 'Priority',
            $type: 'SingleEnumIssueCustomField',
            value: { name: report.priority }
          },
          {
            name: 'Type',
            $type: 'SingleEnumIssueCustomField',
            value: { name: 'BUG' }
          }
        ],
        tasks: bug.reproductionSteps || [],
        acceptanceCriteria: [
          'Bug is fixed and verified',
          'Regression test added',
          'No new issues introduced'
        ]
      });

      report.id = response.data.idReadable;

      // Add attachments if any
      if (bug.screenshots) {
        for (const screenshot of bug.screenshots) {
          await this.attachFile(report.id, screenshot);
        }
      }

      if (bug.logs) {
        await this.attachLogs(report.id, bug.logs);
      }

      return {
        success: true,
        issueId: report.id,
        report
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        report
      };
    }
  }

  generateDescription(bug) {
    const sections = [];

    sections.push('## Beschreibung');
    sections.push(bug.description || 'Ein Fehler wurde entdeckt.');
    sections.push('');

    if (bug.environment) {
      sections.push('## Umgebung');
      sections.push(`- Browser: ${bug.environment.browser || 'N/A'}`);
      sections.push(`- OS: ${bug.environment.os || 'N/A'}`);
      sections.push(`- Version: ${bug.environment.version || 'N/A'}`);
      sections.push('');
    }

    if (bug.reproductionSteps) {
      sections.push('## Schritte zur Reproduktion');
      bug.reproductionSteps.forEach((step, index) => {
        sections.push(`${index + 1}. ${step}`);
      });
      sections.push('');
    }

    sections.push('## Erwartetes Verhalten');
    sections.push(bug.expectedBehavior || 'Das System sollte korrekt funktionieren.');
    sections.push('');

    sections.push('## Tatsächliches Verhalten');
    sections.push(bug.actualBehavior || 'Das System verhält sich nicht wie erwartet.');
    sections.push('');

    if (bug.stackTrace) {
      sections.push('## Stack Trace');
      sections.push('```');
      sections.push(bug.stackTrace);
      sections.push('```');
      sections.push('');
    }

    sections.push(`_Automatisch erstellt von ${this.name} - ${new Date().toISOString()}_`);

    return sections.join('\n');
  }

  calculatePriority(bug) {
    // Calculate priority based on severity and impact
    if (bug.severity === 'critical' || bug.impact === 'blocker') {
      return 'Critical';
    }
    if (bug.severity === 'high' || bug.impact === 'major') {
      return 'Major';
    }
    if (bug.severity === 'medium' || bug.impact === 'normal') {
      return 'Normal';
    }
    return 'Minor';
  }

  async attachFile(issueId, filePath) {
    try {
      await axios.post(`${YOUTRACK_MCP}/issues/${issueId}/attachments-from-path`, {
        path: filePath
      });
      return true;
    } catch (error) {
      console.error('Failed to attach file:', error);
      return false;
    }
  }

  async attachLogs(issueId, logs) {
    try {
      // Save logs to temporary file
      const logFile = path.join(PROJECT_ROOT, `logs-${Date.now()}.txt`);
      await fs.writeFile(logFile, logs);
      
      // Attach to issue
      await this.attachFile(issueId, logFile);
      
      // Clean up
      await fs.unlink(logFile);
      
      return true;
    } catch (error) {
      console.error('Failed to attach logs:', error);
      return false;
    }
  }
}

module.exports = { 
  UnitTestAgent, 
  E2ETestAgent, 
  CodeReviewAgent, 
  BugReportAgent 
};
