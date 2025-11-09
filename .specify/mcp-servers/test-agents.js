/**
 * Test Script für Multi-Agent Orchestrator
 * Testet die Grundfunktionalität des Systems
 */

const axios = require('axios');
const fs = require('node:fs').promises;
const path = require('node:path');

const ORCHESTRATOR_URL = 'http://localhost:4300';
const YOUTRACK_URL = 'http://luzumi.youtrack.cloud';
const WEB_MCP_URL = 'http://192.168.56.1:4200/';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('');
  log('=' .repeat(50), colors.cyan);
  log(title, colors.bright + colors.cyan);
  log('=' .repeat(50), colors.cyan);
  console.log('');
}

async function checkServer(url, name) {
  try {
    const response = await axios.get(`${url}/health`);
    if (response.status === 200) {
      log(`✓ ${name} is running`, colors.green);
      return true;
    }
  } catch (error) {
    log(`✗ ${name} is not responding at ${url}`, colors.red);
    log(`✗ ${error.message}`, colors.red);
    return false;
  }
  return false;
}

async function testOrchestratorAPI() {
  logSection('Testing Orchestrator API');

  const tests = [];

  // Test 1: Get system status
  try {
    const response = await axios.get(`${ORCHESTRATOR_URL}/status`);
    if (response.data && response.data.teams) {
      log('✓ GET /status - System status retrieved', colors.green);
      log(`  Teams: ${Object.keys(response.data.teams).length}`, colors.blue);
      log(`  Agents: ${response.data.metrics.totalAgents}`, colors.blue);
      tests.push(true);
    }
  } catch (error) {
    log('✗ GET /status failed', colors.red);
    log(`✗ ${error.message}`, colors.red);
    tests.push(false);
  }

  // Test 2: Get teams
  try {
    const response = await axios.get(`${ORCHESTRATOR_URL}/teams`);
    if (response.data) {
      log('✓ GET /teams - Teams retrieved', colors.green);
      for (const [name, info] of Object.entries(response.data)) {
        log(`  ${name}: ${info.memberCount} members`, colors.blue);
      }
      tests.push(true);
    }
  } catch (error) {
    log('✗ GET /teams failed', colors.red);
    log(`✗ ${error.message}`, colors.red);
    tests.push(false);
  }

  // Test 3: Get agents
  try {
    const response = await axios.get(`${ORCHESTRATOR_URL}/agents`);
    if (Array.isArray(response.data)) {
      log('✓ GET /agents - Agents retrieved', colors.green);
      log(`  Total agents: ${response.data.length}`, colors.blue);
      tests.push(true);
    }
  } catch (error) {
    log('✗ GET /agents failed', colors.red);
    log(`✗ ${error.message}`, colors.red);
    tests.push(false);
  }

  // Test 4: Create test project
  try {
    const testProject = {
      name: 'Test Project',
      description: 'Automated test project',
      requirements: [
        'Test requirement 1',
        'Test requirement 2'
      ],
      sprintDuration: 7,
      createYoutrackIssue: false
    };

    const response = await axios.post(`${ORCHESTRATOR_URL}/projects`, testProject);
    if (response.data.success) {
      log('✓ POST /projects - Project created', colors.green);
      log(`  Project ID: ${response.data.project.id}`, colors.blue);
      tests.push(true);

      // Get project details
      const projectResponse = await axios.get(
        `${ORCHESTRATOR_URL}/projects/${response.data.project.id}`
      );
      if (projectResponse.data) {
        log('✓ GET /projects/:id - Project details retrieved', colors.green);
        tests.push(true);
      }
    }
  } catch (error) {
    log('✗ Project creation/retrieval failed', colors.red);
    log(`✗ ${error.message}`, colors.red);
    tests.push(false);
  }

  return tests.every(Boolean);
}

async function testAgentCapabilities() {
  logSection('Testing Agent Capabilities');

  // Test Requirements Agent
  log('Testing Requirements Agent...', colors.yellow);
  const RequirementsAgent = require('./agents/planning-agents').RequirementsAgent;
  const reqAgent = new RequirementsAgent();

  const requirements = `
    The system must provide user authentication
    Users should be able to create and manage projects
    Performance: Response time must be under 2 seconds
    Security: All passwords must be encrypted
  `;

  const analysis = await reqAgent.analyzeRequirements(requirements);

  if (analysis.functional.length > 0 && analysis.nonFunctional.length > 0) {
    log('✓ Requirements analysis completed', colors.green);
    log(`  Functional: ${analysis.functional.length}`, colors.blue);
    log(`  Non-functional: ${analysis.nonFunctional.length}`, colors.blue);
    log(`  User stories: ${analysis.userStories.length}`, colors.blue);
    log(`  Estimated effort: ${analysis.estimatedEffort.days} days`, colors.blue);
    return true;
  } else {
    log('✗ Requirements analysis failed', colors.red);
    return false;
  }
}

async function testIntegration() {
  logSection('Testing Integration');

  // Check if example project exists
  const examplePath = path.join(__dirname, 'examples', 'example-project.json');

  try {
    const projectData = await fs.readFile(examplePath, 'utf-8');
    const project = JSON.parse(projectData);

    log('✓ Example project loaded', colors.green);
    log(`  Project: ${project.name}`, colors.blue);
    log(`  Requirements: ${project.requirements.length}`, colors.blue);
    log(`  Phases: ${project.phases.length}`, colors.blue);
    log(`  Backlog items: ${project.backlog.length}`, colors.blue);

    // Try to create the project
    const response = await axios.post(`${ORCHESTRATOR_URL}/projects`, {
      ...project,
      createYoutrackIssue: false // Don't create real issues for test
    });

    if (response.data.success) {
      log('✓ Integration test project created successfully', colors.green);
      return true;
    }
  } catch (error) {
    log('✗ Integration test failed: ' + error.message, colors.red);
    return false;
  }

  return false;
}

async function generateReport(results) {
  logSection('Test Report');

  const total = Object.keys(results).length;
  const passed = Object.values(results).filter(Boolean).length;
  const failed = total - passed;

  log(`Total Tests: ${total}`, colors.bright);
  log(`Passed: ${passed}`, colors.green);
  log(`Failed: ${failed}`, failed > 0 ? colors.red : colors.green);

  console.log('');
  log('Test Results:', colors.bright);
  for (const [name, result] of Object.entries(results)) {
    const icon = result ? '✓' : '✗';
    const color = result ? colors.green : colors.red;
    log(`  ${icon} ${name}`, color);
  }

  console.log('');
  const successRate = ((passed / total) * 100).toFixed(1);
  let passedColor = failed > passed ? colors.red : colors.yellow;
  const finalColor = passed === total ? colors.green : passedColor;
  log(`Success Rate: ${successRate}%`, finalColor);

  // Save report to file
  const report = {
    timestamp: new Date().toISOString(),
    results,
    summary: {
      total,
      passed,
      failed,
      successRate: Number.parseFloat(successRate)
    }
  };

  await fs.writeFile(
    path.join(__dirname, 'test-report.json'),
    JSON.stringify(report, null, 2)
  );

  log('Report saved to test-report.json', colors.cyan);
}

async function main() {
  log('=' .repeat(50), colors.bright + colors.cyan);
  log('Multi-Agent Orchestrator Test Suite', colors.bright + colors.cyan);
  log('=' .repeat(50), colors.bright + colors.cyan);

  const results = {};

  // Check server availability
  logSection('Server Health Check');
  results['Orchestrator Server'] = await checkServer(ORCHESTRATOR_URL, 'Orchestrator');
  results['YouTrack MCP'] = await checkServer(YOUTRACK_URL, 'YouTrack MCP');
  results['Web MCP'] = await checkServer(WEB_MCP_URL, 'Web MCP');

  // Only run tests if orchestrator is running
  if (results['Orchestrator Server']) {
    results['Orchestrator API'] = await testOrchestratorAPI();
    results['Agent Capabilities'] = await testAgentCapabilities();
    results['Integration'] = await testIntegration();
  } else {
    log('', colors.yellow);
    log('⚠ Skipping API tests - Orchestrator not running', colors.yellow);
    log('Start the orchestrator with: npm run orchestrator', colors.yellow);
  }

  // Generate report
  await generateReport(results);

  log('=' .repeat(50), colors.cyan);
  log('Test suite completed', colors.bright + colors.cyan);
  log('=' .repeat(50), colors.cyan);
}

// Run tests
main().catch(error => {
  log('Fatal error: ' + error.message, colors.red);
  process.exit(1);
});
