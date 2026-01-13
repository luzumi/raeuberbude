import { Controller, Get, Post, Body, Param, Query, Put, Delete } from '@nestjs/common';
import { LoggingService } from './logging.service';
import { LlmInstancesService } from '../llm/llm-instances.service';
import { LlmValidationService } from '../llm/llm-validation.service';
import { ValidateTranscriptDto } from '../llm/dto/validate-transcript.dto';
import { LmStudioMcpService } from '../llm/lm-studio-mcp.service';

@Controller('/api')
export class LoggingController {
  constructor(
    private readonly svc: LoggingService,
    private readonly llmInstances: LlmInstancesService,
    private readonly llmValidation: LlmValidationService,
    private readonly lmStudioMcp: LmStudioMcpService,
  ) {}

  // ============================================================================
  // TRANSCRIPT ENDPOINTS
  // ============================================================================

  @Post('/transcripts')
  createTranscript(@Body() body: any) {
    return this.svc.createTranscript(body);
  }

  @Get('/transcripts')
  listTranscripts(@Query() query: any) {
    const page = Number.parseInt(query.page || '1', 10);
    const limit = Number.parseInt(query.limit || '50', 10);
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

  @Delete('/transcripts/:id')
  deleteTranscript(@Param('id') id: string) {
    return this.svc.deleteTranscript(id);
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
    const page = Number.parseInt(query.page || '1', 10);
    const limit = Number.parseInt(query.limit || '50', 10);
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
    return this.llmInstances.list({ syncActive: true });
  }

  @Post('/llm-instances/scan')
  scanLlmInstances(@Body() body: any) {
    return this.llmInstances.scan();
  }

  @Post('/llm-instances/cleanup')
  cleanupLlmInstances() {
    return this.llmInstances.cleanupDuplicates();
  }

  @Post('/llm-instances/sync-active')
  syncActiveInstances() {
    return this.llmInstances.syncActiveFlagsFromLmStudio();
  }

  @Put('/llm-instances/:id/role')
  setInstanceRole(@Param('id') id: string, @Body() body: any) {
    return this.llmInstances.updateRole(id, body?.role);
  }

  @Post('/llm-instances/:id/load')
  loadLlmInstance(@Param('id') id: string) {
    return this.llmInstances.load(id);
  }

  @Post('/llm-instances/:id/load-with-policy')
  loadLlmInstanceWithPolicy(@Param('id') id: string, @Body() body: any) {
    // Policy-Load wird aktuell nicht gesondert implementiert; API-Kompatibilität
    return this.llmInstances.load(id);
  }

  @Post('/llm-instances/:id/eject')
  ejectLlmInstance(@Param('id') id: string) {
    return this.llmInstances.eject(id);
  }

  @Delete('/llm-instances/:id')
  deleteLlmInstance(@Param('id') id: string) {
    return this.llmInstances.delete(id);
  }

  @Post('/llm-instances/normalize')
  normalizeAndCleanupInstances() {
    return { message: 'Normalize instances not implemented - MongoDB removed' };
  }

  @Get('/llm-instances/:id/system-prompt')
  getSystemPrompt(@Param('id') id: string) {
    return this.llmInstances.getSystemPrompt(id);
  }

  @Get('/llm-instances/:id/model-status')
  getModelStatusForInstance(@Param('id') id: string) {
    return this.llmInstances.getModelStatusForInstance(id);
  }

  @Put('/llm-instances/:id/system-prompt')
  updateSystemPrompt(@Param('id') id: string, @Body() body: any) {
    return this.llmInstances.setSystemPrompt(id, body.systemPrompt);
  }

  @Put('/llm-instances/:id/config')
  updateInstanceConfig(@Param('id') id: string, @Body() body: any, @Query('autoReload') autoReload?: string) {
    return this.llmInstances.updateConfig(id, body);
  }

  @Get('/system-prompt/default')
  getDefaultSystemPrompt() {
    return { prompt: 'Default system prompt' };
  }

  @Post('/test-llm')
  testLlmRequest(@Body() body: any) {
    return this.svc.testLlmRequest(body.instanceId);
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

  // ============================================================================
  // SPEECH / TRANSCRIPT VALIDATION (LLM)
  // ============================================================================

  @Post('/speech/validate')
  validateSpeechTranscript(@Body() body: ValidateTranscriptDto) {
    return this.llmValidation.validateTranscript(body);
  }

  // ============================================================================
  // LLM STUDIO (server-side) HELPERS
  // ============================================================================

  /**
   * Liefert die Modell-Liste aus LM Studio serverseitig (CORS-frei).
   * WICHTIG: Das ist eine Momentaufnahme der /v1/models Liste (je nach LM Studio ggf. "loaded"/"available").
   */
  @Get('/llm-studio/models')
  async listLmStudioModels(@Query('mode') mode?: 'available' | 'loaded') {
    const m = (mode || 'available').toLowerCase() as any;
    const models = m === 'loaded'
      ? await this.lmStudioMcp.listLoadedModels().catch(() => [])
      : await this.lmStudioMcp.listModels().catch(() => []);

    const ids = (models || [])
      .map((x: any) => x?.id || x?.model || x?.name)
      .filter(Boolean)
      .map(String);

    return {
      source: 'mcp',
      mode: m,
      count: ids.length,
      models: ids,
    };
  }
}
