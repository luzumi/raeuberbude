/**
 * Planning und Product Owner Agenten
 * Verwaltet Requirements, User Stories, Sprint Planning und Backlog
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const YOUTRACK_MCP = process.env.YOUTRACK_MCP_URL || 'http://localhost:5180';
const PROJECT_ROOT = process.env.PROJECT_ROOT || path.resolve(__dirname, '../../../');

class RequirementsAgent {
  constructor(config = {}) {
    this.name = config.name || 'Requirements Specialist';
    this.capabilities = ['requirements-analysis', 'validation', 'documentation'];
  }

  async analyzeRequirements(input) {
    const analysis = {
      functional: [],
      nonFunctional: [],
      userStories: [],
      risks: [],
      dependencies: [],
      estimatedEffort: null
    };

    // Parse input requirements
    if (typeof input === 'string') {
      analysis.functional = this.extractFunctionalRequirements(input);
      analysis.nonFunctional = this.extractNonFunctionalRequirements(input);
    } else if (Array.isArray(input)) {
      for (const req of input) {
        const processed = await this.processRequirement(req);
        if (processed.type === 'functional') {
          analysis.functional.push(processed);
        } else {
          analysis.nonFunctional.push(processed);
        }
      }
    }

    // Generate user stories from requirements
    analysis.userStories = this.generateUserStories(analysis.functional);
    
    // Identify risks
    analysis.risks = this.identifyRisks(analysis);
    
    // Find dependencies
    analysis.dependencies = this.findDependencies(analysis);
    
    // Estimate effort
    analysis.estimatedEffort = this.estimateEffort(analysis);

    return analysis;
  }

  async validateRequirements(requirements) {
    const validation = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    for (const req of requirements) {
      // Check completeness
      if (!req.id || !req.description) {
        validation.errors.push({
          requirement: req.id || 'unknown',
          issue: 'Missing required fields'
        });
        validation.valid = false;
      }

      // Check clarity
      if (req.description && req.description.length < 20) {
        validation.warnings.push({
          requirement: req.id,
          issue: 'Description too brief'
        });
      }

      // Check testability
      if (!req.acceptanceCriteria || req.acceptanceCriteria.length === 0) {
        validation.warnings.push({
          requirement: req.id,
          issue: 'No acceptance criteria defined'
        });
      }
    }

    return validation;
  }

  extractFunctionalRequirements(text) {
    const requirements = [];
    const lines = text.split('\n');
    
    const functionalKeywords = [
      'muss', 'soll', 'kann', 'wird',
      'must', 'shall', 'should', 'will',
      'feature', 'funktion', 'function'
    ];

    lines.forEach((line, index) => {
      const lower = line.toLowerCase();
      if (functionalKeywords.some(keyword => lower.includes(keyword))) {
        requirements.push({
          id: `FR-${index + 1}`,
          type: 'functional',
          description: line.trim(),
          priority: this.detectPriority(line),
          category: this.detectCategory(line)
        });
      }
    });

    return requirements;
  }

  extractNonFunctionalRequirements(text) {
    const requirements = [];
    const lines = text.split('\n');
    
    const nfKeywords = [
      'performance', 'security', 'sicherheit',
      'usability', 'reliability', 'verfügbarkeit',
      'scalability', 'skalierbarkeit', 'response'
    ];

    lines.forEach((line, index) => {
      const lower = line.toLowerCase();
      if (nfKeywords.some(keyword => lower.includes(keyword))) {
        requirements.push({
          id: `NFR-${index + 1}`,
          type: 'non-functional',
          description: line.trim(),
          category: this.detectNFRCategory(line)
        });
      }
    });

    return requirements;
  }

  generateUserStories(functionalRequirements) {
    return functionalRequirements.map((req, index) => ({
      id: `US-${index + 1}`,
      title: this.generateStoryTitle(req),
      story: `Als Benutzer möchte ich ${req.description.toLowerCase()}, damit ich meine Aufgaben effizienter erledigen kann.`,
      acceptanceCriteria: this.generateAcceptanceCriteria(req),
      priority: req.priority || 'medium',
      points: this.estimateStoryPoints(req)
    }));
  }

  generateStoryTitle(requirement) {
    const verbs = ['create', 'view', 'edit', 'delete', 'manage'];
    const verb = verbs.find(v => requirement.description.toLowerCase().includes(v)) || 'manage';
    return `User can ${verb} ${requirement.category || 'feature'}`;
  }

  generateAcceptanceCriteria(requirement) {
    return [
      `Given: User is authenticated and on the ${requirement.category || 'main'} page`,
      `When: User performs the action described`,
      `Then: System ${requirement.description.toLowerCase()}`,
      `And: User receives appropriate feedback`
    ];
  }

  identifyRisks(analysis) {
    const risks = [];
    
    if (analysis.functional.length > 20) {
      risks.push({
        type: 'complexity',
        level: 'high',
        description: 'High number of functional requirements may lead to complexity',
        mitigation: 'Consider phased implementation'
      });
    }

    if (analysis.nonFunctional.length === 0) {
      risks.push({
        type: 'quality',
        level: 'medium',
        description: 'No non-functional requirements specified',
        mitigation: 'Define performance, security, and usability requirements'
      });
    }

    return risks;
  }

  findDependencies(analysis) {
    const dependencies = [];
    const keywords = ['after', 'before', 'requires', 'depends on'];
    
    for (const req of analysis.functional) {
      const lower = req.description.toLowerCase();
      for (const keyword of keywords) {
        if (lower.includes(keyword)) {
          dependencies.push({
            requirement: req.id,
            type: 'sequential',
            description: `May depend on other requirements (contains "${keyword}")`
          });
        }
      }
    }
    
    return dependencies;
  }

  estimateEffort(analysis) {
    const baseEffort = 2; // Base hours per requirement
    let totalEffort = 0;
    
    totalEffort += analysis.functional.length * baseEffort;
    totalEffort += analysis.nonFunctional.length * baseEffort * 1.5;
    
    const complexityFactor = 1 + (analysis.dependencies.length * 0.1);
    totalEffort *= complexityFactor;
    
    return {
      hours: Math.round(totalEffort),
      days: Math.ceil(totalEffort / 8)
    };
  }

  detectPriority(text) {
    const high = ['critical', 'urgent', 'must', 'required'];
    const medium = ['should', 'important'];
    const low = ['could', 'nice to have', 'optional'];
    
    const lower = text.toLowerCase();
    
    if (high.some(word => lower.includes(word))) return 'high';
    if (medium.some(word => lower.includes(word))) return 'medium';
    if (low.some(word => lower.includes(word))) return 'low';
    
    return 'medium';
  }

  detectCategory(text) {
    const categories = {
      'authentication': ['login', 'logout', 'auth', 'password'],
      'user-management': ['user', 'profile'],
      'data-management': ['create', 'read', 'update', 'delete', 'crud'],
      'reporting': ['report', 'export'],
      'integration': ['api', 'integration'],
      'ui': ['button', 'form', 'page', 'screen']
    };
    
    const lower = text.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => lower.includes(keyword))) {
        return category;
      }
    }
    
    return 'general';
  }

  detectNFRCategory(text) {
    const lower = text.toLowerCase();
    
    if (lower.includes('performance') || lower.includes('response')) return 'performance';
    if (lower.includes('security')) return 'security';
    if (lower.includes('usability')) return 'usability';
    if (lower.includes('reliability')) return 'reliability';
    if (lower.includes('scalab')) return 'scalability';
    
    return 'quality';
  }

  estimateStoryPoints(requirement) {
    const complexity = requirement.description.length / 50;
    
    if (requirement.priority === 'high') return Math.max(1, Math.ceil(complexity * 1.5));
    if (requirement.priority === 'low') return Math.max(1, Math.ceil(complexity * 0.5));
    
    return Math.max(1, Math.ceil(complexity));
  }
}

class SprintPlannerAgent {
  constructor(config = {}) {
    this.name = config.name || 'Sprint Planner';
    this.capabilities = ['sprint-planning', 'capacity-planning', 'velocity-tracking'];
    this.defaultVelocity = 30; // Story points per sprint
  }

  async planSprint(config) {
    const sprint = {
      id: `Sprint-${Date.now()}`,
      name: config.name || `Sprint ${new Date().toISOString().split('T')[0]}`,
      startDate: config.startDate || new Date(),
      endDate: this.calculateEndDate(config.startDate, config.duration || 14),
      goals: config.goals || [],
      capacity: await this.calculateCapacity(config),
      plannedStories: [],
      risks: []
    };

    if (config.backlog) {
      sprint.plannedStories = await this.selectStoriesForSprint(
        config.backlog,
        sprint.capacity
      );
    }

    sprint.risks = this.identifySprintRisks(sprint);

    if (config.createInYoutrack) {
      sprint.youtrackId = await this.createYoutrackSprint(sprint);
    }

    return sprint;
  }

  async calculateCapacity(config) {
    const capacity = {
      totalDays: config.duration || 14,
      workDays: 0,
      teamMembers: config.teamSize || 5,
      totalHours: 0,
      storyPoints: 0,
      buffer: 0.2
    };

    capacity.workDays = Math.floor(capacity.totalDays * 5 / 7);
    
    if (config.holidays) {
      capacity.workDays -= config.holidays;
    }

    capacity.totalHours = capacity.workDays * capacity.teamMembers * 6;
    
    const velocity = config.velocity || this.defaultVelocity;
    capacity.storyPoints = Math.floor(velocity * (1 - capacity.buffer));

    return capacity;
  }

  calculateEndDate(startDate, duration) {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + duration);
    return end;
  }

  async selectStoriesForSprint(backlog, capacity) {
    const selected = [];
    let totalPoints = 0;
    
    const sorted = [...backlog].sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
    });

    for (const story of sorted) {
      const points = story.points || 0;
      if (totalPoints + points <= capacity.storyPoints) {
        selected.push({
          ...story,
          assigned: true
        });
        totalPoints += points;
      }
    }

    return selected;
  }

  identifySprintRisks(sprint) {
    const risks = [];
    const plannedPoints = sprint.plannedStories.reduce((sum, s) => sum + (s.points || 0), 0);
    
    if (plannedPoints > sprint.capacity.storyPoints * 0.9) {
      risks.push({
        type: 'overcommitment',
        level: 'high',
        description: 'Sprint is at or near full capacity',
        mitigation: 'Consider removing low-priority items'
      });
    }

    if (sprint.capacity.teamMembers < 3) {
      risks.push({
        type: 'capacity',
        level: 'medium',
        description: 'Small team size may impact velocity',
        mitigation: 'Focus on core features only'
      });
    }

    return risks;
  }

  async createYoutrackSprint(sprint) {
    try {
      const response = await axios.post(`${YOUTRACK_MCP}/issues`, {
        summary: sprint.name,
        description: this.generateSprintDescription(sprint),
        type: 'EPIC',
        tasks: sprint.plannedStories.map(s => s.title)
      });

      return response.data.idReadable;
    } catch (error) {
      console.error('Failed to create sprint in YouTrack:', error);
      return null;
    }
  }

  generateSprintDescription(sprint) {
    const sections = [];

    sections.push('## Sprint Goals');
    sprint.goals.forEach(goal => sections.push(`- ${goal}`));
    sections.push('');

    sections.push('## Capacity');
    sections.push(`- Duration: ${sprint.capacity.totalDays} days`);
    sections.push(`- Team Size: ${sprint.capacity.teamMembers} members`);
    sections.push(`- Story Points: ${sprint.capacity.storyPoints}`);
    sections.push('');

    sections.push('## Planned Stories');
    sprint.plannedStories.forEach(story => {
      sections.push(`- [${story.priority}] ${story.title} (${story.points} points)`);
    });

    return sections.join('\n');
  }
}

class BacklogManagerAgent {
  constructor(config = {}) {
    this.name = config.name || 'Backlog Manager';
    this.capabilities = ['backlog-management', 'prioritization', 'grooming'];
  }

  async manageBacklog(items) {
    const backlog = {
      items: [],
      totalPoints: 0,
      priorityDistribution: {}
    };

    for (const item of items) {
      const processed = await this.processBacklogItem(item);
      backlog.items.push(processed);
      backlog.totalPoints += processed.points || 0;
      backlog.priorityDistribution[processed.priority] = 
        (backlog.priorityDistribution[processed.priority] || 0) + 1;
    }

    backlog.items = this.prioritizeBacklog(backlog.items);
    
    return backlog;
  }

  async processBacklogItem(item) {
    return {
      ...item,
      id: item.id || `ITEM-${Date.now()}`,
      createdAt: item.createdAt || new Date(),
      status: item.status || 'new',
      priority: item.priority || this.calculatePriority(item),
      points: item.points || this.estimatePoints(item),
      readiness: this.assessReadiness(item)
    };
  }

  prioritizeBacklog(items) {
    return items.sort((a, b) => {
      const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityWeight[a.priority] || 0;
      const bPriority = priorityWeight[b.priority] || 0;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      const aValue = (a.businessValue || 1) / (a.points || 1);
      const bValue = (b.businessValue || 1) / (b.points || 1);
      
      return bValue - aValue;
    });
  }

  calculatePriority(item) {
    let score = 0;
    
    score += (item.businessValue || 0) * 2;
    if (item.reducesRisk) score += 3;
    if (item.customerImpact === 'high') score += 4;
    if (item.technicalDebt) score += 2;
    
    if (score >= 8) return 'critical';
    if (score >= 5) return 'high';
    if (score >= 2) return 'medium';
    return 'low';
  }

  estimatePoints(item) {
    const sizeMap = {
      'xs': 1, 's': 2, 'm': 3, 'l': 5, 'xl': 8, 'xxl': 13
    };
    
    if (item.size) {
      return sizeMap[item.size.toLowerCase()] || 3;
    }
    
    let points = 2;
    if (item.description) {
      points += Math.floor(item.description.length / 100);
    }
    
    return Math.min(13, points);
  }

  assessReadiness(item) {
    const criteria = {
      hasDescription: !!item.description && item.description.length > 20,
      hasAcceptanceCriteria: !!item.acceptanceCriteria && item.acceptanceCriteria.length > 0,
      hasEstimate: !!item.points,
      hasPriority: !!item.priority
    };
    
    const metCriteria = Object.values(criteria).filter(c => c).length;
    const readiness = (metCriteria / Object.keys(criteria).length) * 100;
    
    return {
      score: readiness,
      status: readiness >= 80 ? 'ready' : readiness >= 60 ? 'needs-refinement' : 'not-ready',
      criteria
    };
  }
}

module.exports = { 
  RequirementsAgent, 
  SprintPlannerAgent, 
  BacklogManagerAgent 
};
