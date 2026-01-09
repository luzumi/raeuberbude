import { Controller, Get, Post, Body, Param, Query, Put, Delete } from '@nestjs/common';
import { LoggingService } from './logging.service';

@Controller('/api')
export class LoggingController {
  constructor(private readonly svc: LoggingService) {}

  // ============================================================================
  // TRANSCRIPT ENDPOINTS
  // ============================================================================

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
    return this.svc.getTranscripts(page, limit, q);
  }

  @Get('/transcripts/:id')
  getTranscript(@Param('id') id: string) {
    return this.svc.getTranscriptById(id);
  }

  @Put('/transcripts/:id')
  updateTranscript(@Param('id') id: string, @Body() body: any) {
    return this.svc.updateTranscript(id, body);
  }

  @Post('/transcripts/bulk-update')
  bulkUpdate(@Body() body: any) {
    const { ids, updates } = body;
    return this.svc.updateManyTranscripts(ids, updates);
  }

  @Get('/transcripts/stats/summary')
  stats(@Query() query: any) {
    return this.svc.getTranscriptStats();
  }

  // ============================================================================
  // LLM CONFIG ENDPOINTS (Placeholder)
  // ============================================================================

  @Get('/llm-config')
  getLlmConfig() {
    return { message: 'LLM config not implemented - MongoDB removed' };
  }

  @Post('/llm-config')
  saveLlmConfig(@Body() body: any) {
    return { message: 'LLM config save not implemented - MongoDB removed' };
  }

  @Get('/runtime-config')
  getRuntimeConfig() {
    return { message: 'Runtime config not implemented - MongoDB removed' };
  }

  // ============================================================================
  // INTENT LOG ENDPOINTS
  // ============================================================================

  @Post('/intent-logs')
  createIntentLog(@Body() body: any) {
    return this.svc.createIntentLog(body);
  }

  @Get('/intent-logs')
  listIntentLogs(@Query() query: any) {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '50', 10);
    const q: any = {};
    if (query.userId) q.userId = query.userId;
    if (query.terminalId) q.terminalId = query.terminalId;
    return this.svc.getIntentLogs(page, limit, q);
  }

  @Get('/intent-logs/stats')
  intentStats() {
    return this.svc.getIntentLogStats();
  }

  // ============================================================================
  // CATEGORY ENDPOINTS
  // ============================================================================

  @Get('/categories')
  listCategories() {
    return this.svc.getCategories();
  }

  @Post('/categories')
  createCategory(@Body() body: any) {
    return this.svc.createCategory(body);
  }

  // ============================================================================
  // DATABASE ENDPOINTS
  // ============================================================================

  @Get('/db-info')
  dbInfo() {
    return this.svc.getDbStats();
  }

  // ============================================================================
  // LLM INSTANCE ENDPOINTS
  // ============================================================================

  @Get('/llm-instances')
  listLlmInstances() {
    return this.svc.getLlmInstances();
  }

  @Post('/llm-instances/scan')
  scanLlmInstances(@Body() body: any) {
    return this.svc.scanLlmInstances();
  }

  @Post('/llm-instances/cleanup')
  cleanupLlmInstances() {
    return this.svc.cleanupOldInstances();
  }

  @Post('/llm-instances/:id/load')
  loadLlmInstance(@Param('id') id: string) {
    return { message: 'Load LLM instance not implemented - MongoDB removed' };
  }

  @Post('/llm-instances/:id/eject')
  ejectLlmInstance(@Param('id') id: string) {
    return { message: 'Eject LLM instance not implemented - MongoDB removed' };
  }

  @Delete('/llm-instances/:id')
  deleteLlmInstance(@Param('id') id: string) {
    return this.svc.deleteInstance(id);
  }

  @Post('/llm-instances/normalize')
  normalizeAndCleanupInstances() {
    return { message: 'Normalize instances not implemented - MongoDB removed' };
  }

  @Get('/llm-instances/:id/system-prompt')
  getSystemPrompt(@Param('id') id: string) {
    return { message: 'Get system prompt not implemented - MongoDB removed' };
  }

  @Get('/llm-instances/:id/model-status')
  getModelStatusForInstance(@Param('id') id: string) {
    return { message: 'Get model status not implemented - MongoDB removed' };
  }

  @Put('/llm-instances/:id/system-prompt')
  updateSystemPrompt(@Param('id') id: string, @Body() body: any) {
    return this.svc.updateInstanceSystemPrompt(id, body.systemPrompt);
  }

  @Put('/llm-instances/:id/config')
  updateInstanceConfig(@Param('id') id: string, @Body() body: any, @Query('autoReload') autoReload?: string) {
    const config = body;
    return this.svc.updateInstanceSamplingParams(id, config);
  }

  @Get('/system-prompt/default')
  getDefaultSystemPrompt() {
    return { prompt: 'Default system prompt' };
  }

  @Post('/test-llm')
  testLlmRequest(@Body() body: any) {
    return this.svc.testInstance(body.instanceId);
  }

  // ============================================================================
  // AI PROCESSING ENDPOINTS (Still working)
  // ============================================================================

  @Post('/categorize')
  async categorize(@Body() body: { text: string; categories: any[] }) {
    return this.svc.categorizeTranscript(body.text, body.categories);
  }

  @Post('/parse-intent')
  async parseIntent(@Body() body: { text: string }) {
    return this.svc.parseUserIntentNew(body.text);
  }

  @Post('/sync-models')
  async syncModels() {
    return this.svc.syncLmStudioModels();
  }
}

