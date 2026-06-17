import { Module } from '@nestjs/common';
import { ClaudeService } from './claude.service';
import { LlmConfigController } from './llm-config.controller';

@Module({
  providers: [ClaudeService],
  controllers: [LlmConfigController],
  exports: [ClaudeService],
})
export class LlmModule {}
