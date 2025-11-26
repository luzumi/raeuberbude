import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { Transcript } from './schemas/transcript.schema';
import { Category } from './schemas/category.schema';
import { LlmInstance } from './schemas/llminstance.schema';
import { IntentLog } from './schemas/intentlog.schema';
import { LoggingController } from './logging.controller';
import { LoggingService } from './logging.service';
import { LmStudioMcpService } from '../llm/lm-studio-mcp.service';
import { LlmClientService } from '../llm/llm-client.service';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: Transcript.name, schema: (Transcript as any).schema },
      { name: Category.name, schema: (Category as any).schema },
      { name: LlmInstance.name, schema: (LlmInstance as any).schema },
      { name: IntentLog.name, schema: (IntentLog as any).schema },
    ])
  ],
  controllers: [LoggingController],
  providers: [LoggingService, LmStudioMcpService, LlmClientService],
  exports: [LoggingService, LlmClientService]
})
export class LoggingModule {}
