/**
 * Spezialisierte Coding Agenten
 * Implementiert konkrete Entwicklungsaufgaben
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const WEB_MCP = process.env.WEB_MCP_URL || 'http://localhost:4200';
const PROJECT_ROOT = process.env.PROJECT_ROOT || path.resolve(__dirname, '../../../');

class FrontendAgent {
  constructor(config = {}) {
    this.name = config.name || 'Frontend Specialist';
    this.capabilities = ['angular', 'typescript', 'components', 'services'];
    this.webSession = null;
  }

  async createComponent(spec) {
    const componentPath = path.join(
      PROJECT_ROOT,
      'src/app/components',
      spec.name
    );
    
    // Component TypeScript
    const componentTs = `import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-${spec.name}',
  templateUrl: './${spec.name}.component.html',
  styleUrls: ['./${spec.name}.component.scss']
})
export class ${this.toPascalCase(spec.name)}Component implements OnInit {
  ${spec.inputs ? spec.inputs.map(i => `@Input() ${i.name}: ${i.type};`).join('\n  ') : ''}
  ${spec.outputs ? spec.outputs.map(o => `@Output() ${o.name} = new EventEmitter<${o.type}>();`).join('\n  ') : ''}
  
  constructor() { }

  ngOnInit(): void {
    ${spec.onInit || '// Initialize component'}
  }
  
  ${spec.methods ? spec.methods.map(m => this.generateMethod(m)).join('\n\n  ') : ''}
}`;

    // Component HTML
    const componentHtml = spec.template || `<div class="${spec.name}-container">
  <h2>${this.toPascalCase(spec.name)} Component</h2>
  <!-- Add your template here -->
</div>`;

    // Component SCSS
    const componentScss = spec.styles || `.${spec.name}-container {
  padding: 1rem;
  
  h2 {
    color: var(--primary-color);
    margin-bottom: 1rem;
  }
}`;

    // Create files
    await fs.mkdir(componentPath, { recursive: true });
    await fs.writeFile(
      path.join(componentPath, `${spec.name}.component.ts`),
      componentTs
    );
    await fs.writeFile(
      path.join(componentPath, `${spec.name}.component.html`),
      componentHtml
    );
    await fs.writeFile(
      path.join(componentPath, `${spec.name}.component.scss`),
      componentScss
    );

    // Component spec file for testing
    const componentSpec = `import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ${this.toPascalCase(spec.name)}Component } from './${spec.name}.component';

describe('${this.toPascalCase(spec.name)}Component', () => {
  let component: ${this.toPascalCase(spec.name)}Component;
  let fixture: ComponentFixture<${this.toPascalCase(spec.name)}Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ${this.toPascalCase(spec.name)}Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(${this.toPascalCase(spec.name)}Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});`;

    await fs.writeFile(
      path.join(componentPath, `${spec.name}.component.spec.ts`),
      componentSpec
    );

    return {
      success: true,
      component: spec.name,
      path: componentPath,
      files: [
        `${spec.name}.component.ts`,
        `${spec.name}.component.html`,
        `${spec.name}.component.scss`,
        `${spec.name}.component.spec.ts`
      ]
    };
  }

  async createService(spec) {
    const servicePath = path.join(PROJECT_ROOT, 'src/app/services');
    
    const serviceTs = `import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ${this.toPascalCase(spec.name)}Service {
  private apiUrl = '${spec.apiUrl || '/api'}';
  ${spec.subjects ? spec.subjects.map(s => `private ${s.name}Subject = new BehaviorSubject<${s.type}>(${s.initial});`).join('\n  ') : ''}
  ${spec.subjects ? spec.subjects.map(s => `public ${s.name}$ = this.${s.name}Subject.asObservable();`).join('\n  ') : ''}

  constructor(private http: HttpClient) { }

  ${spec.methods ? spec.methods.map(m => this.generateServiceMethod(m)).join('\n\n  ') : ''}
}`;

    await fs.mkdir(servicePath, { recursive: true });
    await fs.writeFile(
      path.join(servicePath, `${spec.name}.service.ts`),
      serviceTs
    );

    // Service spec file
    const serviceSpec = `import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ${this.toPascalCase(spec.name)}Service } from './${spec.name}.service';

describe('${this.toPascalCase(spec.name)}Service', () => {
  let service: ${this.toPascalCase(spec.name)}Service;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(${this.toPascalCase(spec.name)}Service);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});`;

    await fs.writeFile(
      path.join(servicePath, `${spec.name}.service.spec.ts`),
      serviceSpec
    );

    return {
      success: true,
      service: spec.name,
      path: servicePath,
      files: [
        `${spec.name}.service.ts`,
        `${spec.name}.service.spec.ts`
      ]
    };
  }

  async testInBrowser(component) {
    try {
      // Start browser session
      const sessionResponse = await axios.post(`${WEB_MCP}/sessions`, {
        url: 'http://localhost:4200',
        headless: false
      });
      
      this.webSession = sessionResponse.data.sessionId;
      
      // Navigate to component route
      await axios.post(`${WEB_MCP}/sessions/${this.webSession}/navigate`, {
        url: `http://localhost:4200/${component}`
      });
      
      // Take screenshot
      await axios.post(`${WEB_MCP}/sessions/${this.webSession}/screenshot`, {
        fullPage: true,
        path: `./screenshots/${component}-${Date.now()}.png`
      });
      
      // Get console logs
      const logs = await axios.get(`${WEB_MCP}/sessions/${this.webSession}/logs/console`);
      
      return {
        success: true,
        sessionId: this.webSession,
        logs: logs.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  toPascalCase(str) {
    return str.replace(/(^\w|-\w)/g, match => 
      match.replace('-', '').toUpperCase()
    );
  }

  generateMethod(method) {
    return `${method.name}(${method.params || ''}): ${method.returnType || 'void'} {
    ${method.body || '// TODO: Implement method'}
  }`;
  }

  generateServiceMethod(method) {
    if (method.type === 'http') {
      return `${method.name}(${method.params || ''}): Observable<${method.returnType || 'any'}> {
    return this.http.${method.httpMethod || 'get'}<${method.returnType || 'any'}>(
      \`\${this.apiUrl}${method.endpoint}\`${method.body ? ', ' + method.body : ''}
    ).pipe(
      catchError(error => {
        console.error('Error in ${method.name}:', error);
        throw error;
      })
    );
  }`;
    }
    
    return `${method.name}(${method.params || ''}): ${method.returnType || 'void'} {
    ${method.body || '// TODO: Implement method'}
  }`;
  }
}

class BackendAgent {
  constructor(config = {}) {
    this.name = config.name || 'Backend Specialist';
    this.capabilities = ['nestjs', 'express', 'api', 'microservices'];
  }

  async createController(spec) {
    const controllerPath = path.join(
      PROJECT_ROOT,
      'backend/nest-app/src/modules',
      spec.module,
      'controllers'
    );

    const controllerTs = `import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query,
  UseGuards,
  HttpCode,
  HttpStatus 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ${this.toPascalCase(spec.name)}Service } from '../services/${spec.name}.service';
${spec.dtos ? spec.dtos.map(dto => `import { ${dto} } from '../dto/${this.toKebabCase(dto)}.dto';`).join('\n') : ''}

@ApiTags('${spec.name}')
@Controller('${spec.route || spec.name}')
export class ${this.toPascalCase(spec.name)}Controller {
  constructor(private readonly ${spec.name}Service: ${this.toPascalCase(spec.name)}Service) {}

  ${spec.endpoints ? spec.endpoints.map(ep => this.generateEndpoint(ep)).join('\n\n  ') : ''}
}`;

    await fs.mkdir(controllerPath, { recursive: true });
    await fs.writeFile(
      path.join(controllerPath, `${spec.name}.controller.ts`),
      controllerTs
    );

    // Controller spec file
    const controllerSpec = `import { Test, TestingModule } from '@nestjs/testing';
import { ${this.toPascalCase(spec.name)}Controller } from './${spec.name}.controller';
import { ${this.toPascalCase(spec.name)}Service } from '../services/${spec.name}.service';

describe('${this.toPascalCase(spec.name)}Controller', () => {
  let controller: ${this.toPascalCase(spec.name)}Controller;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [${this.toPascalCase(spec.name)}Controller],
      providers: [
        {
          provide: ${this.toPascalCase(spec.name)}Service,
          useValue: {
            // Mock service methods
          }
        }
      ],
    }).compile();

    controller = module.get<${this.toPascalCase(spec.name)}Controller>(${this.toPascalCase(spec.name)}Controller);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});`;

    await fs.writeFile(
      path.join(controllerPath, `${spec.name}.controller.spec.ts`),
      controllerSpec
    );

    return {
      success: true,
      controller: spec.name,
      path: controllerPath
    };
  }

  async createService(spec) {
    const servicePath = path.join(
      PROJECT_ROOT,
      'backend/nest-app/src/modules',
      spec.module,
      'services'
    );

    const serviceTs = `import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
${spec.imports ? spec.imports.join('\n') : ''}

@Injectable()
export class ${this.toPascalCase(spec.name)}Service {
  constructor(
    ${spec.models ? spec.models.map(m => `@InjectModel('${m}') private readonly ${m.toLowerCase()}Model: Model<${m}>`).join(',\n    ') : ''}
  ) {}

  ${spec.methods ? spec.methods.map(m => this.generateServiceMethod(m)).join('\n\n  ') : ''}
}`;

    await fs.mkdir(servicePath, { recursive: true });
    await fs.writeFile(
      path.join(servicePath, `${spec.name}.service.ts`),
      serviceTs
    );

    return {
      success: true,
      service: spec.name,
      path: servicePath
    };
  }

  async createDTO(spec) {
    const dtoPath = path.join(
      PROJECT_ROOT,
      'backend/nest-app/src/modules',
      spec.module,
      'dto'
    );

    const dtoTs = `import { IsString, IsNumber, IsOptional, IsNotEmpty, IsEmail, IsDate } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ${this.toPascalCase(spec.name)}Dto {
  ${spec.fields ? spec.fields.map(f => this.generateDTOField(f)).join('\n\n  ') : ''}
}`;

    await fs.mkdir(dtoPath, { recursive: true });
    await fs.writeFile(
      path.join(dtoPath, `${spec.name}.dto.ts`),
      dtoTs
    );

    return {
      success: true,
      dto: spec.name,
      path: dtoPath
    };
  }

  generateEndpoint(endpoint) {
    const decorators = [];
    
    // HTTP method decorator
    decorators.push(`@${endpoint.method}('${endpoint.path || ''}')`);
    
    // Swagger decorators
    decorators.push(`@ApiOperation({ summary: '${endpoint.summary || endpoint.name}' })`);
    decorators.push(`@ApiResponse({ status: ${endpoint.successStatus || 200}, description: '${endpoint.successDesc || 'Success'}' })`);
    
    if (endpoint.httpCode) {
      decorators.push(`@HttpCode(HttpStatus.${endpoint.httpCode})`);
    }
    
    if (endpoint.guards) {
      endpoint.guards.forEach(guard => {
        decorators.push(`@UseGuards(${guard})`);
      });
    }

    const params = [];
    if (endpoint.params) params.push(`@Param() params: any`);
    if (endpoint.body) params.push(`@Body() body: ${endpoint.bodyType || 'any'}`);
    if (endpoint.query) params.push(`@Query() query: any`);

    return `${decorators.join('\n  ')}
  async ${endpoint.name}(${params.join(', ')}): Promise<${endpoint.returnType || 'any'}> {
    ${endpoint.implementation || `return this.${endpoint.service || 'service'}.${endpoint.name}(${endpoint.serviceParams || ''});`}
  }`;
  }

  generateDTOField(field) {
    const decorators = [];
    
    // Validation decorators
    if (field.required) {
      decorators.push('@IsNotEmpty()');
    } else {
      decorators.push('@IsOptional()');
    }
    
    switch(field.type) {
      case 'string':
        decorators.push('@IsString()');
        break;
      case 'number':
        decorators.push('@IsNumber()');
        break;
      case 'email':
        decorators.push('@IsEmail()');
        break;
      case 'date':
        decorators.push('@IsDate()');
        break;
    }
    
    // Swagger decorator
    if (field.required) {
      decorators.push(`@ApiProperty({ description: '${field.description || field.name}' })`);
    } else {
      decorators.push(`@ApiPropertyOptional({ description: '${field.description || field.name}' })`);
    }

    return `${decorators.join('\n  ')}
  ${field.name}${field.required ? '' : '?'}: ${field.type};`;
  }

  generateServiceMethod(method) {
    return `async ${method.name}(${method.params || ''}): Promise<${method.returnType || 'any'}> {
    ${method.implementation || '// TODO: Implement method'}
  }`;
  }

  toPascalCase(str) {
    return str.replace(/(^\w|-\w|_\w)/g, match => 
      match.replace(/[-_]/, '').toUpperCase()
    );
  }

  toKebabCase(str) {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }
}

class DatabaseAgent {
  constructor(config = {}) {
    this.name = config.name || 'Database Specialist';
    this.capabilities = ['mongodb', 'mongoose', 'typeorm', 'postgresql'];
  }

  async createMongooseSchema(spec) {
    const schemaPath = path.join(
      PROJECT_ROOT,
      'backend/nest-app/src/modules',
      spec.module,
      'schemas'
    );

    const schemaTs = `import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
${spec.imports ? spec.imports.join('\n') : ''}

export type ${spec.name}Document = ${spec.name} & Document;

@Schema({ 
  timestamps: true,
  collection: '${spec.collection || spec.name.toLowerCase()}s'
})
export class ${spec.name} {
  ${spec.fields ? spec.fields.map(f => this.generateSchemaField(f)).join('\n\n  ') : ''}
}

export const ${spec.name}Schema = SchemaFactory.createForClass(${spec.name});

// Indexes
${spec.indexes ? spec.indexes.map(idx => `${spec.name}Schema.index(${JSON.stringify(idx.fields)}, ${JSON.stringify(idx.options || {})});`).join('\n') : ''}

// Virtual fields
${spec.virtuals ? spec.virtuals.map(v => this.generateVirtual(spec.name, v)).join('\n') : ''}

// Pre/Post hooks
${spec.hooks ? spec.hooks.map(h => this.generateHook(spec.name, h)).join('\n') : ''}`;

    await fs.mkdir(schemaPath, { recursive: true });
    await fs.writeFile(
      path.join(schemaPath, `${spec.name.toLowerCase()}.schema.ts`),
      schemaTs
    );

    return {
      success: true,
      schema: spec.name,
      path: schemaPath
    };
  }

  async createTypeOrmEntity(spec) {
    const entityPath = path.join(
      PROJECT_ROOT,
      'backend/nest-app/src/modules',
      spec.module,
      'entities'
    );

    const entityTs = `import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  CreateDateColumn, 
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
  Index
} from 'typeorm';
${spec.imports ? spec.imports.join('\n') : ''}

@Entity('${spec.table || spec.name.toLowerCase()}')
export class ${spec.name} {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  ${spec.fields ? spec.fields.map(f => this.generateEntityField(f)).join('\n\n  ') : ''}

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}`;

    await fs.mkdir(entityPath, { recursive: true });
    await fs.writeFile(
      path.join(entityPath, `${spec.name.toLowerCase()}.entity.ts`),
      entityTs
    );

    return {
      success: true,
      entity: spec.name,
      path: entityPath
    };
  }

  async createMigration(spec) {
    const timestamp = Date.now();
    const migrationPath = path.join(
      PROJECT_ROOT,
      'backend/nest-app/src/migrations'
    );

    const migrationTs = `import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class ${spec.name}${timestamp} implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    ${spec.up || '// TODO: Implement migration up'}
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    ${spec.down || '// TODO: Implement migration down'}
  }
}`;

    await fs.mkdir(migrationPath, { recursive: true });
    await fs.writeFile(
      path.join(migrationPath, `${timestamp}-${spec.name}.ts`),
      migrationTs
    );

    return {
      success: true,
      migration: `${timestamp}-${spec.name}`,
      path: migrationPath
    };
  }

  generateSchemaField(field) {
    const decorators = [];
    const options = {};
    
    if (field.required) options.required = true;
    if (field.default !== undefined) options.default = field.default;
    if (field.unique) options.unique = true;
    if (field.index) options.index = true;
    
    if (field.ref) {
      options.type = 'Types.ObjectId';
      options.ref = `'${field.ref}'`;
    }
    
    if (field.enum) {
      options.enum = field.enum;
    }
    
    const optStr = Object.entries(options)
      .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
      .join(', ');
    
    decorators.push(`@Prop(${optStr ? `{ ${optStr} }` : ''})`);
    
    let fieldType = field.type;
    if (field.ref) {
      fieldType = `Types.ObjectId`;
    } else if (field.array) {
      fieldType = `${field.type}[]`;
    }
    
    return `${decorators.join('\n  ')}
  ${field.name}: ${fieldType};`;
  }

  generateEntityField(field) {
    const decorators = [];
    const options = {};
    
    if (field.type === 'string') {
      options.type = 'varchar';
      if (field.length) options.length = field.length;
    } else if (field.type === 'number') {
      options.type = field.decimal ? 'decimal' : 'int';
    } else if (field.type === 'boolean') {
      options.type = 'boolean';
      if (field.default !== undefined) options.default = field.default;
    } else if (field.type === 'date') {
      options.type = 'timestamp';
    } else if (field.type === 'json') {
      options.type = 'jsonb';
    }
    
    if (field.nullable) options.nullable = true;
    if (field.unique) options.unique = true;
    
    if (field.index) {
      decorators.push(`@Index()`);
    }
    
    if (field.relation) {
      if (field.relation.type === 'many-to-one') {
        decorators.push(`@ManyToOne(() => ${field.relation.entity}, ${field.relation.inverse || 'null'})`);
      } else if (field.relation.type === 'one-to-many') {
        decorators.push(`@OneToMany(() => ${field.relation.entity}, ${field.relation.inverse})`);
      } else if (field.relation.type === 'many-to-many') {
        decorators.push(`@ManyToMany(() => ${field.relation.entity})`);
        if (field.relation.owner) {
          decorators.push(`@JoinTable()`);
        }
      }
    } else {
      const optStr = Object.entries(options)
        .map(([k, v]) => `${k}: ${typeof v === 'string' ? `'${v}'` : v}`)
        .join(', ');
      decorators.push(`@Column(${optStr ? `{ ${optStr} }` : ''})`);
    }
    
    return `${decorators.join('\n  ')}
  ${field.name}: ${field.fieldType || field.type};`;
  }

  generateVirtual(schemaName, virtual) {
    return `${schemaName}Schema.virtual('${virtual.name}').get(function() {
  ${virtual.getter || 'return null;'}
});`;
  }

  generateHook(schemaName, hook) {
    return `${schemaName}Schema.${hook.type}('${hook.event}', ${hook.async ? 'async ' : ''}function(${hook.params || 'next'}) {
  ${hook.body || 'next();'}
});`;
  }
}

module.exports = { FrontendAgent, BackendAgent, DatabaseAgent };
