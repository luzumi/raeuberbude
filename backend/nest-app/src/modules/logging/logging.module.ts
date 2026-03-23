import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Transcript } from './schemas/transcript.schema';
import { Category } from './schemas/category.schema';
import { IntentLog } from './schemas/intentlog.schema';
import { LoggingController } from './logging.controller';
import { LoggingService } from './logging.service';
import { ClaudeService } from '../llm/claude.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transcript.name, schema: (Transcript as any).schema },
      { name: Category.name, schema: (Category as any).schema },
      { name: IntentLog.name, schema: (IntentLog as any).schema },
    ])
  ],
  controllers: [LoggingController],
  providers: [LoggingService, ClaudeService],
  exports: [LoggingService, ClaudeService]
})
export class LoggingModule {}
