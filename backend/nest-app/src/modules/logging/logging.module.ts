import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { TranscriptEntity } from './entities';
import { LlmInstanceEntity } from '../llm/entities/llm-instance.entity';
import { LoggingController } from './logging.controller';
import { LoggingService } from './logging.service';
import { LmStudioMcpService } from '../llm/lm-studio-mcp.service';
import { LlmClientService } from '../llm/llm-client.service';
import { LlmInstancesService } from '../llm/llm-instances.service';
import {
  Category,
  IntentLog,
  Keyword,
  Suggestion,
  TranscriptKeyword,
  TranscriptSuggestion,
  IntentLogKeyword
} from './entities';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([
      TranscriptEntity,
      Category,
      LlmInstanceEntity,
      IntentLog,
      Keyword,
      Suggestion,
      TranscriptKeyword,
      TranscriptSuggestion,
      IntentLogKeyword,
    ])
  ],
  controllers: [LoggingController],
  providers: [LoggingService, LmStudioMcpService, LlmClientService, LlmInstancesService],
  exports: [LoggingService, LlmClientService, LlmInstancesService]
})
export class LoggingModule {}
