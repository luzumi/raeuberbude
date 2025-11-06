/**
 * DevOps und Integration Agenten
 * Automatisierung von Build, Deployment, Monitoring und MCP-Management
 */

const { exec } = require('node:child_process');
const { promisify } = require('node:util');
const execAsync = promisify(exec);
const axios = require('axios');
const fs = require('node:fs').promises;
const path = require('node:path');
const yaml = require('js-yaml');

const WEB_MCP = process.env.WEB_MCP_URL || 'http://localhost:4200';
const PROJECT_ROOT = process.env.PROJECT_ROOT || path.resolve(__dirname, '../../../');

class BuildAgent {
  constructor(config = {}) {
    this.name = config.name || 'Build Agent';
    this.capabilities = ['webpack', 'angular-cli', 'docker', 'npm'];
  }

  async buildProject(spec) {
    const buildResult = {
      success: false,
      artifacts: [],
      logs: [],
      metrics: {
        startTime: Date.now(),
        endTime: null,
        duration: null,
        size: null
      }
    };

    try {
      // Determine build type
      const buildType = spec.type || await this.detectBuildType();

      // Run build based on type
      let buildCommand;
      switch(buildType) {
        case 'angular':
          buildCommand = await this.buildAngular(spec);
          break;
        case 'nestjs':
          buildCommand = await this.buildNestJS(spec);
          break;
        case 'docker':
          buildCommand = await this.buildDocker(spec);
          break;
        default:
          buildCommand = 'npm run build';
      }

      // Execute build
      const { stdout, stderr } = await execAsync(buildCommand, {
        cwd: spec.path || PROJECT_ROOT
      });

      buildResult.logs.push(stdout);
      if (stderr) buildResult.logs.push(`Warnings: ${stderr}`);

      // Collect artifacts
      buildResult.artifacts = await this.collectArtifacts(spec);

      // Calculate metrics
      buildResult.metrics.endTime = Date.now();
      buildResult.metrics.duration = buildResult.metrics.endTime - buildResult.metrics.startTime;
      buildResult.metrics.size = await this.calculateBuildSize(spec);

      buildResult.success = true;

      // Run post-build tasks
      if (spec.postBuild) {
        await this.runPostBuildTasks(spec.postBuild);
      }

    } catch (error) {
      buildResult.success = false;
      buildResult.error = error.message;
      buildResult.logs.push(`Build failed: ${error.message}`);
    }

    return buildResult;
  }

  async detectBuildType() {
    try {
      const packageJson = await fs.readFile(
        path.join(PROJECT_ROOT, 'package.json'),
        'utf-8'
      );
      const pkg = JSON.parse(packageJson);

      if (pkg.dependencies) {
        if (pkg.dependencies['@angular/core']) return 'angular';
        if (pkg.dependencies['@nestjs/core']) return 'nestjs';
      }

      // Check for Docker
      const dockerfileExists = await fs.access(
        path.join(PROJECT_ROOT, 'Dockerfile')
      ).then(() => true).catch(() => false);

      if (dockerfileExists) return 'docker';

    } catch (error) {
      console.error('Error detecting build type:', error);
    }

    return 'npm';
  }

  async buildAngular(spec) {
    const env = spec.environment || 'production';
    const outputPath = spec.outputPath || 'dist';

    let command = `ng build --configuration=${env}`;

    if (spec.aot !== false) command += ' --aot';
    if (spec.optimization !== false) command += ' --optimization';
    if (spec.sourceMap) command += ' --source-map';
    if (spec.baseHref) command += ` --base-href=${spec.baseHref}`;

    return command;
  }

  async buildNestJS(spec) {
    return 'npm run build';
  }

  async buildDocker(spec) {
    const imageName = spec.imageName || 'app';
    const tag = spec.tag || 'latest';
    const dockerfile = spec.dockerfile || 'Dockerfile';

    return `docker build -t ${imageName}:${tag} -f ${dockerfile} .`;
  }

  async collectArtifacts(spec) {
    const artifacts = [];
    const distPath = path.join(
      spec.path || PROJECT_ROOT,
      spec.outputPath || 'dist'
    );

    try {
      const files = await fs.readdir(distPath, { withFileTypes: true });

      for (const file of files) {
        if (file.isFile()) {
          const filePath = path.join(distPath, file.name);
          const stats = await fs.stat(filePath);

          artifacts.push({
            name: file.name,
            path: filePath,
            size: stats.size,
            created: stats.ctime
          });
        }
      }
    } catch (error) {
      console.error('Error collecting artifacts:', error);
    }

    return artifacts;
  }

  async calculateBuildSize(spec) {
    const distPath = path.join(
      spec.path || PROJECT_ROOT,
      spec.outputPath || 'dist'
    );

    try {
      const { stdout } = await execAsync(`du -sh ${distPath}`);
      const match = stdout.match(/^([\d.]+[KMG]?)/);
      return match ? match[1] : 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  async runPostBuildTasks(tasks) {
    for (const task of tasks) {
      try {
        if (task.type === 'command') {
          await execAsync(task.command, { cwd: PROJECT_ROOT });
        } else if (task.type === 'copy') {
          await fs.copyFile(task.source, task.destination);
        } else if (task.type === 'compress') {
          await this.compressArtifacts(task);
        }
      } catch (error) {
        console.error(`Post-build task failed: ${task.type}`, error);
      }
    }
  }

  async compressArtifacts(task) {
    const command = `tar -czf ${task.output} ${task.input}`;
    await execAsync(command, { cwd: PROJECT_ROOT });
  }
}

class DeploymentAgent {
  constructor(config = {}) {
    this.name = config.name || 'Deployment Agent';
    this.capabilities = ['docker', 'kubernetes', 'pm2', 'nginx'];
  }

  async deploy(spec) {
    const deployment = {
      success: false,
      environment: spec.environment || 'production',
      timestamp: Date.now(),
      logs: [],
      rollbackInfo: null
    };

    try {
      // Pre-deployment checks
      await this.preDeploymentChecks(spec);

      // Create rollback point
      deployment.rollbackInfo = await this.createRollbackPoint(spec);

      // Deploy based on target
      switch(spec.target) {
        case 'docker':
          await this.deployDocker(spec);
          break;
        case 'kubernetes':
          await this.deployKubernetes(spec);
          break;
        case 'pm2':
          await this.deployPM2(spec);
          break;
        case 'static':
          await this.deployStatic(spec);
          break;
        default:
          throw new Error(`Unknown deployment target: ${spec.target}`);
      }

      // Health check
      await this.performHealthCheck(spec);

      // Post-deployment tasks
      await this.postDeploymentTasks(spec);

      deployment.success = true;
      deployment.logs.push('Deployment completed successfully');

    } catch (error) {
      deployment.success = false;
      deployment.error = error.message;
      deployment.logs.push(`Deployment failed: ${error.message}`);

      // Attempt rollback
      if (deployment.rollbackInfo && spec.autoRollback !== false) {
        await this.rollback(deployment.rollbackInfo);
      }
    }

    return deployment;
  }

  async preDeploymentChecks(spec) {
    const checks = [];

    // Check if build artifacts exist
    if (spec.artifacts) {
      for (const artifact of spec.artifacts) {
        const exists = await fs.access(artifact)
          .then(() => true)
          .catch(() => false);

        if (!exists) {
          throw new Error(`Artifact not found: ${artifact}`);
        }
      }
    }

    // Check target availability
    if (spec.healthUrl) {
      try {
        await axios.get(spec.healthUrl, { timeout: 5000 });
      } catch (error) {
        console.warn('Target may be unavailable:', error.message);
      }
    }
  }

  async createRollbackPoint(spec) {
    const rollback = {
      timestamp: Date.now(),
      version: spec.version || 'unknown',
      backup: null
    };

    if (spec.backup) {
      // Create backup of current deployment
      const backupPath = path.join(
        PROJECT_ROOT,
        'backups',
        `backup-${rollback.timestamp}`
      );

      await fs.mkdir(backupPath, { recursive: true });

      // Copy current deployment
      if (spec.currentPath) {
        await execAsync(
          `cp -r ${spec.currentPath} ${backupPath}`,
          { cwd: PROJECT_ROOT }
        );
      }

      rollback.backup = backupPath;
    }

    return rollback;
  }

  async deployDocker(spec) {
    const commands = [];

    // Stop existing container
    if (spec.containerName) {
      commands.push(`docker stop ${spec.containerName} || true`);
      commands.push(`docker rm ${spec.containerName} || true`);
    }

    // Run new container
    let runCommand = `docker run -d --name ${spec.containerName || 'app'}`;

    if (spec.ports) {
      spec.ports.forEach(port => {
        runCommand += ` -p ${port}`;
      });
    }

    if (spec.env) {
      Object.entries(spec.env).forEach(([key, value]) => {
        runCommand += ` -e ${key}="${value}"`;
      });
    }

    if (spec.volumes) {
      spec.volumes.forEach(volume => {
        runCommand += ` -v ${volume}`;
      });
    }

    runCommand += ` ${spec.image || 'app:latest'}`;
    commands.push(runCommand);

    // Execute commands
    for (const cmd of commands) {
      await execAsync(cmd);
    }
  }

  async deployKubernetes(spec) {
    // Generate or use existing manifest
    const manifestPath = spec.manifest || await this.generateK8sManifest(spec);

    // Apply manifest
    await execAsync(`kubectl apply -f ${manifestPath}`);

    // Wait for rollout
    if (spec.deployment) {
      await execAsync(
        `kubectl rollout status deployment/${spec.deployment} -n ${spec.namespace || 'default'}`
      );
    }
  }

  async generateK8sManifest(spec) {
    const manifest = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: spec.name || 'app',
        namespace: spec.namespace || 'default'
      },
      spec: {
        replicas: spec.replicas || 1,
        selector: {
          matchLabels: {
            app: spec.name || 'app'
          }
        },
        template: {
          metadata: {
            labels: {
              app: spec.name || 'app'
            }
          },
          spec: {
            containers: [{
              name: spec.name || 'app',
              image: spec.image || 'app:latest',
              ports: spec.ports ? spec.ports.map(p => ({
                containerPort: parseInt(p.split(':')[1] || p)
              })) : []
            }]
          }
        }
      }
    };

    const manifestPath = path.join(PROJECT_ROOT, 'k8s-manifest.yaml');
    await fs.writeFile(manifestPath, yaml.dump(manifest));

    return manifestPath;
  }

  async deployPM2(spec) {
    const pm2Config = {
      name: spec.name || 'app',
      script: spec.script || 'server.js',
      cwd: spec.cwd || PROJECT_ROOT,
      instances: spec.instances || 1,
      exec_mode: spec.cluster ? 'cluster' : 'fork',
      env: spec.env || {}
    };

    const configPath = path.join(PROJECT_ROOT, 'pm2.config.js');
    await fs.writeFile(
      configPath,
      `module.exports = ${JSON.stringify({ apps: [pm2Config] }, null, 2)};`
    );

    // Stop existing process
    await execAsync(`pm2 stop ${pm2Config.name} || true`);
    await execAsync(`pm2 delete ${pm2Config.name} || true`);

    // Start new process
    await execAsync(`pm2 start ${configPath}`);

    // Save PM2 configuration
    await execAsync('pm2 save');
  }

  async deployStatic(spec) {
    const source = spec.source || path.join(PROJECT_ROOT, 'dist');
    const destination = spec.destination || '/var/www/html';

    // Copy files
    await execAsync(`rsync -avz --delete ${source}/ ${destination}/`);

    // Reload web server
    if (spec.webServer === 'nginx') {
      await execAsync('nginx -s reload');
    } else if (spec.webServer === 'apache') {
      await execAsync('apache2ctl -k graceful');
    }
  }

  async performHealthCheck(spec) {
    if (!spec.healthUrl) return;

    const maxAttempts = spec.healthCheckAttempts || 10;
    const delay = spec.healthCheckDelay || 3000;

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await axios.get(spec.healthUrl, {
          timeout: 5000
        });

        if (response.status === 200) {
          return true;
        }
      } catch (error) {
        console.log(`Health check attempt ${i + 1}/${maxAttempts} failed`);
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }

    throw new Error('Health check failed');
  }

  async postDeploymentTasks(spec) {
    if (!spec.postDeploy) return;

    for (const task of spec.postDeploy) {
      try {
        if (task.type === 'command') {
          await execAsync(task.command);
        } else if (task.type === 'notification') {
          await this.sendNotification(task);
        } else if (task.type === 'smoke-test') {
          await this.runSmokeTests(task);
        }
      } catch (error) {
        console.error(`Post-deployment task failed: ${task.type}`, error);
      }
    }
  }

  async rollback(rollbackInfo) {
    console.log('Initiating rollback...');

    if (rollbackInfo.backup) {
      // Restore from backup
      await execAsync(
        `cp -r ${rollbackInfo.backup}/* ${PROJECT_ROOT}/`,
        { cwd: PROJECT_ROOT }
      );
    }

    console.log('Rollback completed');
  }

  async sendNotification(task) {
    // Implement notification (Slack, email, etc.)
    console.log(`Notification: ${task.message}`);
  }

  async runSmokeTests(task) {
    const { stdout } = await execAsync(
      task.command || 'npm run test:smoke',
      { cwd: PROJECT_ROOT }
    );

    if (!stdout.includes('passed')) {
      throw new Error('Smoke tests failed');
    }
  }
}

class MonitoringAgent {
  constructor(config = {}) {
    this.name = config.name || 'Monitoring Agent';
    this.capabilities = ['metrics', 'logging', 'alerting'];
    this.metrics = new Map();
    this.alerts = [];
  }

  async startMonitoring(spec) {
    const monitoring = {
      id: `MON-${Date.now()}`,
      target: spec.target,
      metrics: [],
      status: 'active',
      startTime: Date.now()
    };

    // Set up monitoring intervals
    const intervals = {};

    if (spec.metrics) {
      for (const metric of spec.metrics) {
        intervals[metric.name] = setInterval(async () => {
          await this.collectMetric(monitoring.id, metric);
        }, metric.interval || 60000);
      }
    }

    // Store monitoring session
    this.metrics.set(monitoring.id, {
      ...monitoring,
      intervals
    });

    return monitoring;
  }

  async collectMetric(monitoringId, metricSpec) {
    try {
      let value;

      switch(metricSpec.type) {
        case 'http':
          value = await this.collectHttpMetric(metricSpec);
          break;
        case 'system':
          value = await this.collectSystemMetric(metricSpec);
          break;
        case 'custom':
          value = await this.collectCustomMetric(metricSpec);
          break;
      }

      const metric = {
        name: metricSpec.name,
        value,
        timestamp: Date.now(),
        unit: metricSpec.unit
      };

      // Store metric
      const monitoring = this.metrics.get(monitoringId);
      if (monitoring) {
        monitoring.metrics.push(metric);

        // Check thresholds
        if (metricSpec.threshold) {
          this.checkThreshold(metric, metricSpec.threshold);
        }
      }

      return metric;
    } catch (error) {
      console.error(`Failed to collect metric ${metricSpec.name}:`, error);
    }
  }

  async collectHttpMetric(spec) {
    const start = Date.now();

    try {
      const response = await axios.get(spec.url, {
        timeout: spec.timeout || 5000
      });

      return {
        responseTime: Date.now() - start,
        statusCode: response.status,
        available: true
      };
    } catch (error) {
      return {
        responseTime: Date.now() - start,
        statusCode: error.response?.status || 0,
        available: false,
        error: error.message
      };
    }
  }

  async collectSystemMetric(spec) {
    let command;

    switch(spec.metric) {
      case 'cpu':
        command = "top -bn1 | grep 'Cpu(s)' | awk '{print $2}'";
        break;
      case 'memory':
        command = "free -m | awk 'NR==2{printf \"%.2f\", $3*100/$2 }'";
        break;
      case 'disk':
        command = "df -h | awk '$NF==\"/\"{printf \"%s\", $5}'";
        break;
      default:
        command = spec.command;
    }

    const { stdout } = await execAsync(command);
    return parseFloat(stdout) || 0;
  }

  async collectCustomMetric(spec) {
    if (spec.command) {
      const { stdout } = await execAsync(spec.command, {
        cwd: PROJECT_ROOT
      });
      return parseFloat(stdout) || stdout.trim();
    }

    if (spec.function) {
      return await spec.function();
    }

    return null;
  }

  checkThreshold(metric, threshold) {
    let violated = false;

    if (threshold.min !== undefined && metric.value < threshold.min) {
      violated = true;
    }

    if (threshold.max !== undefined && metric.value > threshold.max) {
      violated = true;
    }

    if (violated) {
      this.createAlert({
        type: 'threshold',
        metric: metric.name,
        value: metric.value,
        threshold,
        timestamp: Date.now()
      });
    }
  }

  createAlert(alert) {
    this.alerts.push(alert);

    // Notify
    console.warn(`ALERT: ${alert.metric} = ${alert.value} (threshold: ${JSON.stringify(alert.threshold)})`);

    // Could send to external alerting system
  }

  async stopMonitoring(monitoringId) {
    const monitoring = this.metrics.get(monitoringId);

    if (monitoring) {
      // Clear intervals
      for (const interval of Object.values(monitoring.intervals)) {
        clearInterval(interval);
      }

      monitoring.status = 'stopped';
      monitoring.endTime = Date.now();
    }
  }

  getMetrics(monitoringId) {
    return this.metrics.get(monitoringId);
  }

  getAlerts() {
    return this.alerts;
  }
}

class MCPManagerAgent {
  constructor(config = {}) {
    this.name = config.name || 'MCP Manager';
    this.capabilities = ['mcp-server-management', 'connection-monitoring', 'self-healing'];
    this.servers = new Map();
  }

  async startServer(config) {
    const server = {
      id: config.id || `mcp-${Date.now()}`,
      name: config.name,
      port: config.port,
      script: config.script,
      status: 'starting',
      process: null,
      healthUrl: `http://localhost:${config.port}/health`,
      restartCount: 0
    };

    try {
      // Start the server process
      const { exec } = require('child_process');
      server.process = exec(
        `node ${config.script}`,
        {
          cwd: path.dirname(config.script),
          env: { ...process.env, ...config.env }
        }
      );

      server.process.stdout.on('data', (data) => {
        console.log(`[${server.name}] ${data}`);
      });

      server.process.stderr.on('data', (data) => {
        console.error(`[${server.name}] Error: ${data}`);
      });

      server.process.on('exit', (code) => {
        console.log(`[${server.name}] Process exited with code ${code}`);
        server.status = 'stopped';

        // Auto-restart if configured
        if (config.autoRestart && server.restartCount < 3) {
          setTimeout(() => {
            server.restartCount++;
            this.restartServer(server.id);
          }, 5000);
        }
      });

      // Wait for server to be ready
      await this.waitForServer(server);

      server.status = 'running';
      this.servers.set(server.id, server);

      // Set up health monitoring
      if (config.monitor) {
        this.monitorServer(server);
      }

      return server;
    } catch (error) {
      server.status = 'error';
      server.error = error.message;
      throw error;
    }
  }

  async waitForServer(server, maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        await axios.get(server.healthUrl, { timeout: 1000 });
        return true;
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    throw new Error(`Server ${server.name} failed to start`);
  }

  async stopServer(serverId) {
    const server = this.servers.get(serverId);

    if (server && server.process) {
      server.process.kill();
      server.status = 'stopped';
      return true;
    }

    return false;
  }

  async restartServer(serverId) {
    const server = this.servers.get(serverId);

    if (server) {
      await this.stopServer(serverId);
      await new Promise(resolve => setTimeout(resolve, 2000));

      const config = {
        id: server.id,
        name: server.name,
        port: server.port,
        script: server.script
      };

      return await this.startServer(config);
    }
  }

  monitorServer(server) {
    setInterval(async () => {
      try {
        const response = await axios.get(server.healthUrl, {
          timeout: 5000
        });

        if (response.status !== 200) {
          console.warn(`Server ${server.name} health check failed`);
          await this.healServer(server);
        }
      } catch (error) {
        console.error(`Server ${server.name} is not responding`);
        await this.healServer(server);
      }
    }, 30000); // Check every 30 seconds
  }

  async healServer(server) {
    console.log(`Attempting to heal server ${server.name}`);

    // Try restart
    try {
      await this.restartServer(server.id);
      console.log(`Server ${server.name} healed successfully`);
    } catch (error) {
      console.error(`Failed to heal server ${server.name}:`, error);
    }
  }

  getServerStatus() {
    const status = {};

    for (const [id, server] of this.servers) {
      status[id] = {
        name: server.name,
        port: server.port,
        status: server.status,
        restartCount: server.restartCount
      };
    }

    return status;
  }
}

module.exports = {
  BuildAgent,
  DeploymentAgent,
  MonitoringAgent,
  MCPManagerAgent
};
