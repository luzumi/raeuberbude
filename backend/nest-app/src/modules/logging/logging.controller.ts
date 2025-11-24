import { Controller, Get, Post, Body, Param, Query, Put } from '@nestjs/common';
import { LoggingService } from './logging.service';

@Controller('/api')
export class LoggingController {
  constructor(private readonly svc: LoggingService) {}

  @Post('/transcripts')
  createTranscript(@Body() body: any) {
    return this.svc.createTranscript(body);
  }

  @Get('/transcripts')
  listTranscripts(@Query() query: any) {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '50', 10);
    const q: any = {};
    if (query.userId) q.userId = query.userId;
    if (query.terminalId) q.terminalId = query.terminalId;
    if (query.model) q.model = query.model;
    if (query.category) q.category = query.category;
    if (query.isValid !== undefined) q.isValid = query.isValid === 'true';
    if (query.startDate || query.endDate) {
      q.createdAt = {};
      if (query.startDate) q.createdAt.$gte = new Date(query.startDate);
      if (query.endDate) q.createdAt.$lte = new Date(query.endDate);
    }
    return this.svc.listTranscripts(q, page, limit);
  }

  @Get('/transcripts/:id')
  getTranscript(@Param('id') id: string) {
    return this.svc.getTranscript(id);
  }

  @Put('/transcripts/:id')
  updateTranscript(@Param('id') id: string, @Body() body: any) {
    return this.svc.updateTranscript(id, body);
  }

  @Post('/transcripts/bulk-update')
  bulkUpdate(@Body() body: any) {
    const { ids, updates } = body;
    return this.svc.bulkUpdate(ids, updates);
  }

  @Get('/transcripts/stats/summary')
  stats(@Query() query: any) {
    const q: any = {};
    if (query.startDate || query.endDate) {
      q.createdAt = {};
      if (query.startDate) q.createdAt.$gte = new Date(query.startDate);
      if (query.endDate) q.createdAt.$lte = new Date(query.endDate);
    }
    return this.svc.statsSummary(q);
  }

  @Get('/llm-config')
  async llmConfig() {
    return this.svc.getLlmConfig();
  }

  @Post('/llm-config')
  async saveLlmConfig(@Body() body: any) {
    return this.svc.saveLlmConfig(body);
  }

  @Get('/llm-config/runtime')
  async runtimeConfig() {
    return this.svc.getRuntimeConfig();
  }

  @Get('/intent-logs')
  listIntentLogs(@Query() query: any) {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '50', 10);
    const q: any = {};
    if (query.intent) q.intent = query.intent;
    if (query.terminalId) q.terminalId = query.terminalId;
    if (query.startDate || query.endDate) {
      q.createdAt = {};
      if (query.startDate) q.createdAt.$gte = new Date(query.startDate);
      if (query.endDate) q.createdAt.$lte = new Date(query.endDate);
    }
    return this.svc.listIntentLogs(q, page, limit);
  }

  @Post('/intent-logs')
  createIntentLog(@Body() body: any) {
    return this.svc.createIntentLog(body);
  }

  @Get('/intent-logs/stats')
  intentStats() {
    return this.svc.intentStats();
  }

  @Get('/categories')
  categories() {
    return this.svc.listCategories();
  }

  @Post('/categories')
  createCategory(@Body() body: any) {
    return this.svc.createCategory(body);
  }

  @Get('/dbinfo')
  dbinfo() {
    return this.svc.dbInfo();
  }

  @Get('/llm-instances')
  llmInstances() {
    return this.svc.listLlmInstances();
  }

  @Post('/llm-instances/scan')
  scanLlmInstances(@Body() body: any) {
    return this.svc.scanLlmInstances(body?.llmUrls, body?.defaultModel);
  }

  @Post('/llm-instances/cleanup')
  cleanupLlmInstances() {
    return this.svc.cleanupLlmInstances();
  }

  @Post('/llm-instances/:id/load')
  loadModel(@Param('id') id: string) {
    return this.svc.loadLlmInstance(id);
  }

  @Post('/llm-instances/:id/eject')
  ejectModel(@Param('id') id: string) {
    return this.svc.ejectLlmInstance(id);
  }

  @Post('/llm-instances/:id/delete')
  deleteInstance(@Param('id') id: string) {
    return this.svc.deleteLlmInstance(id);
  }

  @Post('/llm-instances/normalize-cleanup')
  normalizeAndCleanup() {
    return this.svc.normalizeAndCleanupInstances();
  }

  @Get('/llm-instances/:id/system-prompt')
  getSystemPrompt(@Param('id') id: string) {
    return this.svc.getSystemPrompt(id);
  }

  @Get('/llm-instances/:id/model-status')
  async getModelStatus(@Param('id') id: string) {
    return this.svc.getModelStatusForInstance(id);
  }

  @Put('/llm-instances/:id/system-prompt')
  updateSystemPrompt(@Param('id') id: string, @Body() body: any) {
    return this.svc.updateSystemPrompt(id, body.systemPrompt);
  }

  @Put('/llm-instances/:id/config')
  updateInstanceConfig(@Param('id') id: string, @Body() body: any) {
    return this.svc.updateInstanceConfig(id, body);
  }

  @Get('/llm-instances/default-prompt')
  getDefaultPrompt() {
    return this.svc.getDefaultSystemPrompt();
  }
}
