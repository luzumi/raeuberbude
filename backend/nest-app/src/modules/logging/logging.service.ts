import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { LmStudioMcpService } from '../llm/lm-studio-mcp.service';
import { LlmClientService } from '../llm/llm-client.service';

@Injectable()
export class LoggingService {
  private readonly logger = new Logger(LoggingService.name);

  private readonly DEFAULT_SYSTEM_PROMPT = `Du bist ein intelligenter deutschsprachiger Smart-Home-Assistent für ein Räuberbude-System.
Deine Aufgabe ist es, Benutzeranfragen zu verstehen und in strukturierte JSON-Aktionen zu übersetzen.`;

  constructor(
    private readonly mcpService: LmStudioMcpService,
    private readonly llmClient: LlmClientService,
  ) {}

  // ============================================================================
  // TRANSCRIPT METHODS - TODO: Migrate to TypeORM
  // ============================================================================

  async createTranscript(data: any) {
    this.logger.warn('createTranscript() not implemented - MongoDB removed, needs TypeORM migration');
    return null;
  }

  async getTranscripts(page = 1, limit = 20, query: any = {}) {
    this.logger.warn('getTranscripts() not implemented - MongoDB removed, needs TypeORM migration');
    return { data: [], total: 0, page, limit };
  }

  async getTranscriptById(id: string) {
    this.logger.warn('getTranscriptById() not implemented - MongoDB removed, needs TypeORM migration');
    return null;
  }

  async updateTranscript(id: string, updates: any) {
    this.logger.warn('updateTranscript() not implemented - MongoDB removed, needs TypeORM migration');
    return null;
  }

  async updateManyTranscripts(ids: string[], updates: any) {
    this.logger.warn('updateManyTranscripts() not implemented - MongoDB removed, needs TypeORM migration');
    return { modifiedCount: 0 };
  }

  async getTranscriptStats() {
    this.logger.warn('getTranscriptStats() not implemented - MongoDB removed, needs TypeORM migration');
    return [];
  }

  async getModelStats() {
    this.logger.warn('getModelStats() not implemented - MongoDB removed, needs TypeORM migration');
    return [];
  }

  // ============================================================================
  // CATEGORY METHODS - TODO: Migrate to TypeORM
  // ============================================================================

  async getCategories() {
    this.logger.warn('getCategories() not implemented - MongoDB removed, needs TypeORM migration');
    return [];
  }

  async createCategory(data: any) {
    this.logger.warn('createCategory() not implemented - MongoDB removed, needs TypeORM migration');
    return null;
  }

  // ============================================================================
  // LLM INSTANCE METHODS - TODO: Migrate to TypeORM
  // ============================================================================

  async getLlmInstances() {
    this.logger.warn('getLlmInstances() not implemented - MongoDB removed, needs TypeORM migration');
    return [];
  }

  async ensureSingleActiveInstance() {
    this.logger.warn('ensureSingleActiveInstance() not implemented - MongoDB removed');
  }

  async ensureSyncedInstance(desiredName: string) {
    this.logger.warn('ensureSyncedInstance() not implemented - MongoDB removed');
    return null;
  }

  async getOrCreateInstance(name: string) {
    this.logger.warn('getOrCreateInstance() not implemented - MongoDB removed');
    return null;
  }

  async getActiveInstance() {
    this.logger.warn('getActiveInstance() not implemented - MongoDB removed');
    return null;
  }

  async getAllInstances() {
    this.logger.warn('getAllInstances() not implemented - MongoDB removed');
    return [];
  }

  async cleanupOldInstances() {
    this.logger.warn('cleanupOldInstances() not implemented - MongoDB removed');
    return [];
  }

  async activateInstance(id: string) {
    this.logger.warn('activateInstance() not implemented - MongoDB removed');
    return null;
  }

  async updateInstance(id: string, updates: any) {
    this.logger.warn('updateInstance() not implemented - MongoDB removed');
    return null;
  }

  async deleteInstance(id: string) {
    this.logger.warn('deleteInstance() not implemented - MongoDB removed');
    return null;
  }

  async testInstance(id: string) {
    this.logger.warn('testInstance() not implemented - MongoDB removed');
    return { success: false, message: 'Not implemented' };
  }

  async updateInstanceSystemPrompt(id: string, systemPrompt: string) {
    this.logger.warn('updateInstanceSystemPrompt() not implemented - MongoDB removed');
    return null;
  }

  async updateInstanceSamplingParams(id: string, samplingParams: any) {
    this.logger.warn('updateInstanceSamplingParams() not implemented - MongoDB removed');
    return null;
  }

  // ============================================================================
  // INTENT LOG METHODS - TODO: Migrate to TypeORM
  // ============================================================================

  async createIntentLog(data: any) {
    this.logger.warn('createIntentLog() not implemented - MongoDB removed');
    return null;
  }

  async getIntentLogs(page = 1, limit = 20, query: any = {}) {
    this.logger.warn('getIntentLogs() not implemented - MongoDB removed');
    return { data: [], total: 0, page, limit };
  }

  async getIntentLogStats() {
    this.logger.warn('getIntentLogStats() not implemented - MongoDB removed');
    return [];
  }

  async getDbStats() {
    this.logger.warn('getDbStats() not implemented - MongoDB removed');
    return null;
  }

  // ============================================================================
  // AI PROCESSING METHODS - These still work with LLM client
  // ============================================================================

  async categorizeTranscript(text: string, categories: any[]): Promise<any> {
    try {
      const prompt = `Kategorisiere folgenden Text in eine der Kategorien: ${categories.map((c: any) => c.key).join(', ')}\n\nText: ${text}\n\nAntworte nur mit dem Kategorienamen.`;

      const response = await this.llmClient.request({
        messages: [{ role: 'user', content: prompt }],
      });

      const category = response.content.trim().toLowerCase();
      return categories.find((c: any) => c.key.toLowerCase() === category) || categories[0];
    } catch (error: any) {
      this.logger.error('Categorization failed:', error);
      return categories[0];
    }
  }

  async parseUserIntentNew(text: string): Promise<any> {
    try {
      const systemPrompt = this.DEFAULT_SYSTEM_PROMPT;
      const response = await this.llmClient.request({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
      });

      try {
        return JSON.parse(response.content);
      } catch {
        return { error: 'Failed to parse JSON', raw: response.content };
      }
    } catch (error: any) {
      this.logger.error('Intent parsing failed:', error);
      return { error: error.message };
    }
  }

  async syncLmStudioModels() {
    this.logger.warn('syncLmStudioModels() not fully implemented - MongoDB removed');
    return [];
  }
}

