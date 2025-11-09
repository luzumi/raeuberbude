/**
 * Multi-Agent Orchestrator für professionelle Softwareentwicklung
 * Koordiniert hierarchische Teams von spezialisierten Agenten über MCP
 */

const express = require('express');
const axios = require('axios');
const EventEmitter = require('events');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json({ limit: '50mb' }));

const PORT = process.env.AGENT_ORCHESTRATOR_PORT || 4300;
const YOUTRACK_MCP = process.env.YOUTRACK_MCP_URL || 'http://localhost:5180';
const WEB_MCP = process.env.WEB_MCP_URL || 'http://localhost:4200';

// Agent Status Enum
const AgentStatus = {
  IDLE: 'idle',
  WORKING: 'working',
  WAITING: 'waiting',
  ERROR: 'error',
  COMPLETED: 'completed'
};

// Message Priority
const Priority = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4
};

// Base Agent Class
class Agent extends EventEmitter {
  constructor(config) {
    super();
    this.id = config.id || crypto.randomBytes(8).toString('hex');
    this.name = config.name;
    this.role = config.role;
    this.type = config.type || 'worker';
    this.leader = config.leader || null;
    this.subAgents = [];
    this.status = AgentStatus.IDLE;
    this.currentTask = null;
    this.taskQueue = [];
    this.capabilities = config.capabilities || [];
    this.memory = new Map();
    this.metrics = {
      tasksCompleted: 0,
      tasksF: 0,
      averageTime: 0,
      lastActive: Date.now()
    };
  }

  async processTask(task) {
    this.status = AgentStatus.WORKING;
    this.currentTask = task;
    this.metrics.lastActive = Date.now();

    try {
      const result = await this.execute(task);
      this.metrics.tasksCompleted++;
      this.status = AgentStatus.IDLE;
      this.currentTask = null;

      this.emit('taskComplete', {
        agentId: this.id,
        task,
        result,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      this.metrics.tasksFailed++;
      this.status = AgentStatus.ERROR;

      this.emit('taskError', {
        agentId: this.id,
        task,
        error: error.message,
        timestamp: Date.now()
      });

      throw error;
    }
  }

  async execute(task) {
    // Override in subclasses
    return { success: true, message: 'Base execution' };
  }

  async communicate(targetAgent, message) {
    return {
      from: this.id,
      to: targetAgent,
      message,
      timestamp: Date.now()
    };
  }

  getStatus() {
    return {
      id: this.id,
      name: this.name,
      role: this.role,
      status: this.status,
      currentTask: this.currentTask,
      queueLength: this.taskQueue.length,
      metrics: this.metrics
    };
  }
}

// Leader Agent Class
class LeaderAgent extends Agent {
  constructor(config) {
    super(config);
    this.type = 'leader';
    this.teamMembers = new Map();
  }

  addTeamMember(agent) {
    this.teamMembers.set(agent.id, agent);
    agent.leader = this.id;
  }

  async delegateTask(task) {
    // Find best suited agent
    const suitableAgent = this.findSuitableAgent(task);
    if (!suitableAgent) {
      throw new Error('No suitable agent found for task');
    }

    return await suitableAgent.processTask(task);
  }

  findSuitableAgent(task) {
    let bestAgent = null;
    let bestScore = -1;

    for (const [id, agent] of this.teamMembers) {
      if (agent.status === AgentStatus.IDLE) {
        const score = this.calculateAgentScore(agent, task);
        if (score > bestScore) {
          bestScore = score;
          bestAgent = agent;
        }
      }
    }

    return bestAgent;
  }

  calculateAgentScore(agent, task) {
    let score = 0;

    // Check capabilities match
    if (task.requiredCapabilities) {
      for (const cap of task.requiredCapabilities) {
        if (agent.capabilities.includes(cap)) {
          score += 10;
        }
      }
    }

    // Consider agent performance
    if (agent.metrics.tasksCompleted > 0) {
      const successRate = agent.metrics.tasksCompleted /
        (agent.metrics.tasksCompleted + agent.metrics.tasksFailed);
      score += successRate * 5;
    }

    return score;
  }

  async coordinateTeam(project) {
    const results = [];

    for (const phase of project.phases) {
      const phaseResults = await this.executePhase(phase);
      results.push(phaseResults);
    }

    return results;
  }

  async executePhase(phase) {
    const tasks = phase.tasks || [];
    const results = [];

    for (const task of tasks) {
      if (task.parallel) {
        // Execute parallel tasks
        const parallelPromises = task.parallel.map(t => this.delegateTask(t));
        const parallelResults = await Promise.all(parallelPromises);
        results.push(...parallelResults);
      } else {
        // Execute sequential task
        const result = await this.delegateTask(task);
        results.push(result);
      }
    }

    return {
      phase: phase.name,
      results,
      timestamp: Date.now()
    };
  }
}

// Team Definitions
const teams = {
  productOwner: {
    leader: new LeaderAgent({
      name: 'Product Owner Leader',
      role: 'product-owner',
      capabilities: ['requirements', 'planning', 'prioritization']
    }),
    members: [
      {
        name: 'Requirements Specialist',
        role: 'requirements-analyst',
        capabilities: ['requirements-analysis', 'validation', 'documentation']
      },
      {
        name: 'User Story Agent',
        role: 'user-story-writer',
        capabilities: ['user-stories', 'acceptance-criteria', 'bdd']
      },
      {
        name: 'Backlog Manager',
        role: 'backlog-manager',
        capabilities: ['backlog-management', 'youtrack-integration', 'prioritization']
      }
    ]
  },

  planning: {
    leader: new LeaderAgent({
      name: 'Planning Leader',
      role: 'planning-leader',
      capabilities: ['sprint-planning', 'resource-management', 'scheduling']
    }),
    members: [
      {
        name: 'Sprint Planner',
        role: 'sprint-planner',
        capabilities: ['sprint-planning', 'youtrack-tickets', 'deadlines']
      },
      {
        name: 'Task Prioritizer',
        role: 'task-prioritizer',
        capabilities: ['prioritization', 'dependency-analysis', 'risk-assessment']
      },
      {
        name: 'Capacity Planner',
        role: 'capacity-planner',
        capabilities: ['resource-estimation', 'capacity-planning', 'workload-balancing']
      }
    ]
  },

  coding: {
    leader: new LeaderAgent({
      name: 'Coding Leader',
      role: 'coding-leader',
      capabilities: ['code-architecture', 'technology-decisions', 'code-review']
    }),
    members: [
      {
        name: 'Frontend Specialist',
        role: 'frontend-developer',
        capabilities: ['angular', 'typescript', 'ui-components', 'reactive-programming']
      },
      {
        name: 'Frontend Styling Specialist',
        role: 'frontend-stylist',
        capabilities: ['scss', 'css-animations', 'responsive-design', 'ux-optimization']
      },
      {
        name: 'Backend Specialist',
        role: 'backend-developer',
        capabilities: ['nestjs', 'nodejs', 'rest-api', 'microservices']
      },
      {
        name: 'MongoDB Specialist',
        role: 'database-specialist',
        capabilities: ['mongodb', 'mongoose', 'data-modeling', 'query-optimization']
      },
      {
        name: 'Documentation Agent',
        role: 'documentation-writer',
        capabilities: ['technical-writing', 'api-docs', 'readme', 'jsdoc']
      },
      {
        name: 'Infrastructure Agent',
        role: 'devops-engineer',
        capabilities: ['docker', 'ci-cd', 'github-actions', 'deployment']
      }
    ]
  },

  codeReview: {
    leader: new LeaderAgent({
      name: 'Code Review Leader',
      role: 'review-leader',
      capabilities: ['code-review', 'quality-assurance', 'best-practices']
    }),
    members: [
      {
        name: 'Style Check Agent',
        role: 'style-checker',
        capabilities: ['linting', 'formatting', 'naming-conventions', 'code-standards']
      },
      {
        name: 'Security Audit Agent',
        role: 'security-auditor',
        capabilities: ['security-scanning', 'vulnerability-detection', 'owasp', 'dependency-audit']
      },
      {
        name: 'Logic Validator',
        role: 'logic-validator',
        capabilities: ['logic-verification', 'algorithm-review', 'performance-analysis']
      }
    ]
  },

  testing: {
    leader: new LeaderAgent({
      name: 'Test Leader',
      role: 'test-leader',
      capabilities: ['test-strategy', 'test-planning', 'quality-metrics']
    }),
    members: [
      {
        name: 'Unit Test Agent',
        role: 'unit-tester',
        capabilities: ['jest', 'mocha', 'unit-testing', 'mocking']
      },
      {
        name: 'Integration Test Agent',
        role: 'integration-tester',
        capabilities: ['api-testing', 'integration-testing', 'postman', 'supertest']
      },
      {
        name: 'E2E Test Agent',
        role: 'e2e-tester',
        capabilities: ['playwright', 'selenium', 'e2e-testing', 'user-scenarios']
      },
      {
        name: 'Bug Reporter',
        role: 'bug-reporter',
        capabilities: ['bug-documentation', 'youtrack-reporting', 'reproduction-steps']
      }
    ]
  },

  devops: {
    leader: new LeaderAgent({
      name: 'DevOps Leader',
      role: 'devops-leader',
      capabilities: ['deployment-strategy', 'infrastructure', 'monitoring']
    }),
    members: [
      {
        name: 'Build Agent',
        role: 'build-engineer',
        capabilities: ['build-automation', 'webpack', 'compilation', 'bundling']
      },
      {
        name: 'Deployment Agent',
        role: 'deployment-engineer',
        capabilities: ['deployment', 'docker', 'kubernetes', 'rollback']
      },
      {
        name: 'Monitoring Agent',
        role: 'monitoring-engineer',
        capabilities: ['monitoring', 'logging', 'alerting', 'metrics']
      }
    ]
  },

  integration: {
    leader: new LeaderAgent({
      name: 'Integration Leader',
      role: 'integration-leader',
      capabilities: ['system-integration', 'maintenance', 'mcp-management']
    }),
    members: [
      {
        name: 'System Integration Agent',
        role: 'integration-engineer',
        capabilities: ['api-integration', 'third-party-services', 'webhooks']
      },
      {
        name: 'Performance Monitor',
        role: 'performance-engineer',
        capabilities: ['performance-monitoring', 'profiling', 'optimization']
      },
      {
        name: 'Maintenance Scheduler',
        role: 'maintenance-planner',
        capabilities: ['maintenance-planning', 'update-scheduling', 'downtime-management']
      },
      {
        name: 'MCP Manager',
        role: 'mcp-manager',
        capabilities: ['mcp-server-management', 'mcp-client-config', 'connection-monitoring', 'self-healing']
      }
    ]
  }
};

// Initialize Teams
class MultiAgentOrchestrator {
  constructor() {
    this.teams = new Map();
    this.agents = new Map();
    this.projects = new Map();
    this.messageQueue = [];
    this.eventBus = new EventEmitter();

    this.initializeTeams();
  }

  initializeTeams() {
    for (const [teamName, teamConfig] of Object.entries(teams)) {
      const leader = teamConfig.leader;
      this.teams.set(teamName, leader);
      this.agents.set(leader.id, leader);

      // Create and add team members
      for (const memberConfig of teamConfig.members) {
        const member = new Agent(memberConfig);
        leader.addTeamMember(member);
        this.agents.set(member.id, member);

        // Setup event listeners
        member.on('taskComplete', (data) => this.handleTaskComplete(data));
        member.on('taskError', (data) => this.handleTaskError(data));
      }
    }
  }

  async createProject(config) {
    const projectId = crypto.randomBytes(8).toString('hex');
    const project = {
      id: projectId,
      name: config.name,
      description: config.description,
      requirements: config.requirements || [],
      phases: this.planProjectPhases(config),
      status: 'created',
      createdAt: Date.now(),
      youtrackId: null
    };

    this.projects.set(projectId, project);

    // Create YouTrack issue if configured
    if (config.createYoutrackIssue) {
      project.youtrackId = await this.createYoutrackIssue(project);
    }

    return project;
  }

  planProjectPhases(config) {
    return [
      {
        name: 'Requirements Analysis',
        team: 'productOwner',
        tasks: [
          {
            type: 'analyze-requirements',
            requiredCapabilities: ['requirements-analysis'],
            input: config.requirements
          },
          {
            type: 'create-user-stories',
            requiredCapabilities: ['user-stories'],
            dependencies: ['analyze-requirements']
          }
        ]
      },
      {
        name: 'Sprint Planning',
        team: 'planning',
        tasks: [
          {
            type: 'create-sprint',
            requiredCapabilities: ['sprint-planning'],
            input: { duration: config.sprintDuration || 14 }
          },
          {
            type: 'prioritize-tasks',
            requiredCapabilities: ['prioritization'],
            dependencies: ['create-sprint']
          }
        ]
      },
      {
        name: 'Development',
        team: 'coding',
        tasks: [
          {
            type: 'implement-features',
            parallel: [
              { type: 'frontend-development', requiredCapabilities: ['angular', 'typescript'] },
              { type: 'backend-development', requiredCapabilities: ['nestjs', 'nodejs'] },
              { type: 'database-setup', requiredCapabilities: ['mongodb', 'mongoose'] }
            ]
          },
          {
            type: 'write-documentation',
            requiredCapabilities: ['technical-writing'],
            dependencies: ['implement-features']
          }
        ]
      },
      {
        name: 'Code Review',
        team: 'codeReview',
        tasks: [
          {
            type: 'review-code',
            parallel: [
              { type: 'style-check', requiredCapabilities: ['linting'] },
              { type: 'security-audit', requiredCapabilities: ['security-scanning'] },
              { type: 'logic-validation', requiredCapabilities: ['logic-verification'] }
            ]
          }
        ]
      },
      {
        name: 'Testing',
        team: 'testing',
        tasks: [
          {
            type: 'run-tests',
            parallel: [
              { type: 'unit-tests', requiredCapabilities: ['unit-testing'] },
              { type: 'integration-tests', requiredCapabilities: ['integration-testing'] },
              { type: 'e2e-tests', requiredCapabilities: ['e2e-testing'] }
            ]
          },
          {
            type: 'report-bugs',
            requiredCapabilities: ['bug-documentation'],
            dependencies: ['run-tests']
          }
        ]
      },
      {
        name: 'Deployment',
        team: 'devops',
        tasks: [
          {
            type: 'build-application',
            requiredCapabilities: ['build-automation']
          },
          {
            type: 'deploy-application',
            requiredCapabilities: ['deployment'],
            dependencies: ['build-application']
          },
          {
            type: 'monitor-deployment',
            requiredCapabilities: ['monitoring'],
            dependencies: ['deploy-application']
          }
        ]
      }
    ];
  }

  async executeProject(projectId) {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    project.status = 'in-progress';
    project.startedAt = Date.now();

    const results = [];

    for (const phase of project.phases) {
      const team = this.teams.get(phase.team);
      if (!team) {
        throw new Error(`Team ${phase.team} not found`);
      }

      const phaseResult = await team.executePhase(phase);
      results.push(phaseResult);

      // Update YouTrack if configured
      if (project.youtrackId) {
        await this.updateYoutrackStatus(project.youtrackId, phase.name, 'completed');
      }
    }

    project.status = 'completed';
    project.completedAt = Date.now();
    project.results = results;

    return project;
  }

  async createYoutrackIssue(project) {
    try {
      const response = await axios.post(`${YOUTRACK_MCP}/issues`, {
        summary: project.name,
        description: project.description,
        type: 'FEATURE',
        tasks: project.phases.map(p => p.name),
        meta: {
          projectId: project.id,
          feature: project.name,
          intent: 'Multi-Agent Orchestrated Development'
        }
      });

      return response.data.idReadable;
    } catch (error) {
      console.error('Failed to create YouTrack issue:', error);
      return null;
    }
  }

  async updateYoutrackStatus(issueId, phase, status) {
    try {
      await axios.post(`${YOUTRACK_MCP}/issues/${issueId}/comments`, {
        text: `Phase "${phase}" ${status} - ${new Date().toISOString()}`
      });
    } catch (error) {
      console.error('Failed to update YouTrack:', error);
    }
  }

  handleTaskComplete(data) {
    this.eventBus.emit('task:complete', data);
    console.log(`Task completed by ${data.agentId}:`, data.task);
  }

  handleTaskError(data) {
    this.eventBus.emit('task:error', data);
    console.error(`Task error from ${data.agentId}:`, data.error);
  }

  getSystemStatus() {
    const status = {
      timestamp: Date.now(),
      teams: {},
      agents: [],
      projects: [],
      metrics: {
        totalAgents: this.agents.size,
        activeAgents: 0,
        totalProjects: this.projects.size,
        activeProjects: 0
      }
    };

    // Collect team status
    for (const [teamName, leader] of this.teams) {
      status.teams[teamName] = {
        leader: leader.getStatus(),
        members: Array.from(leader.teamMembers.values()).map(m => m.getStatus())
      };
    }

    // Collect agent status
    for (const [id, agent] of this.agents) {
      const agentStatus = agent.getStatus();
      status.agents.push(agentStatus);

      if (agent.status === AgentStatus.WORKING) {
        status.metrics.activeAgents++;
      }
    }

    // Collect project status
    for (const [id, project] of this.projects) {
      status.projects.push({
        id: project.id,
        name: project.name,
        status: project.status,
        youtrackId: project.youtrackId,
        createdAt: project.createdAt,
        phases: project.phases.length
      });

      if (project.status === 'in-progress') {
        status.metrics.activeProjects++;
      }
    }

    return status;
  }
}

// Initialize Orchestrator
const orchestrator = new MultiAgentOrchestrator();

// API Endpoints
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'Multi-Agent Orchestrator',
    port: PORT,
    teams: orchestrator.teams.size,
    agents: orchestrator.agents.size
  });
});

app.get('/status', (req, res) => {
  res.json(orchestrator.getSystemStatus());
});

app.get('/teams', (req, res) => {
  const teams = {};
  for (const [name, leader] of orchestrator.teams) {
    teams[name] = {
      leader: leader.name,
      memberCount: leader.teamMembers.size
    };
  }
  res.json(teams);
});

app.get('/agents', (req, res) => {
  const agents = [];
  for (const [id, agent] of orchestrator.agents) {
    agents.push(agent.getStatus());
  }
  res.json(agents);
});

app.get('/agents/:id', (req, res) => {
  const agent = orchestrator.agents.get(req.params.id);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  res.json(agent.getStatus());
});

app.post('/projects', async (req, res) => {
  try {
    const project = await orchestrator.createProject(req.body);
    res.json({
      success: true,
      project
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/projects', (req, res) => {
  const projects = [];
  for (const [id, project] of orchestrator.projects) {
    projects.push({
      id: project.id,
      name: project.name,
      status: project.status,
      youtrackId: project.youtrackId
    });
  }
  res.json(projects);
});

app.get('/projects/:id', (req, res) => {
  const project = orchestrator.projects.get(req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  res.json(project);
});

app.post('/projects/:id/execute', async (req, res) => {
  try {
    const result = await orchestrator.executeProject(req.params.id);
    res.json({
      success: true,
      result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/agents/:id/task', async (req, res) => {
  try {
    const agent = orchestrator.agents.get(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const result = await agent.processTask(req.body);
    res.json({
      success: true,
      result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// MCP Tool Discovery
app.get('/tools', (req, res) => {
  res.json({
    name: 'multi-agent-orchestrator',
    description: 'Hierarchical Multi-Agent System for Software Development',
    baseUrl: `http://localhost:${PORT}`,
    tools: [
      {
        name: 'createProject',
        method: 'POST',
        path: '/projects',
        schema: {
          name: 'string',
          description: 'string',
          requirements: 'array',
          sprintDuration: 'number?',
          createYoutrackIssue: 'boolean?'
        }
      },
      {
        name: 'executeProject',
        method: 'POST',
        path: '/projects/:id/execute',
        schema: {}
      },
      {
        name: 'getSystemStatus',
        method: 'GET',
        path: '/status',
        schema: {}
      },
      {
        name: 'assignTask',
        method: 'POST',
        path: '/agents/:id/task',
        schema: {
          type: 'string',
          input: 'any',
          priority: 'number?'
        }
      }
    ]
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`[Multi-Agent Orchestrator] Listening on http://localhost:${PORT}`);
  console.log(`[Orchestrator] Teams: ${orchestrator.teams.size}`);
  console.log(`[Orchestrator] Total Agents: ${orchestrator.agents.size}`);
  console.log(`[Orchestrator] YouTrack MCP: ${YOUTRACK_MCP}`);
  console.log(`[Orchestrator] Web MCP: ${WEB_MCP}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down Multi-Agent Orchestrator...');
  process.exit(0);
});

module.exports = { MultiAgentOrchestrator, Agent, LeaderAgent };
