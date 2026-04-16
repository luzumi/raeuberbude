import { Controller, Get } from '@nestjs/common';

@Controller('api/llm-config')
export class LlmConfigController {
  @Get()
  getConfig() {
    return {
      model: process.env.LLM_MODEL ?? 'claude-sonnet-4-6',
      maxTokens: Number(process.env.LLM_MAX_TOKENS ?? 500),
      temperature: Number(process.env.LLM_TEMPERATURE ?? 0.3),
    };
  }
}
