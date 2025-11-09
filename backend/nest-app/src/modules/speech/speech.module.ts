import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { SpeechController } from './speech.controller';
import { SpeechService } from './speech.service';
import { RightsService } from './rights.service';
import { TerminalsService } from './terminals.service';
import { STTProviderService } from './stt/stt.provider';
import { VoskProvider } from './stt/vosk.provider';
import { WhisperProvider } from './stt/whisper.provider';
import { AudioConverterService } from './stt/audio-converter.service';
import { HumanInput, HumanInputSchema } from './schemas/human-input.schema';
import { AppTerminal, AppTerminalSchema } from './schemas/app-terminal.schema';
import { UserRights, UserRightsSchema } from './schemas/user-rights.schema';
import { UsersModule } from '../../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: HumanInput.name, schema: HumanInputSchema },
      { name: AppTerminal.name, schema: AppTerminalSchema },
      { name: UserRights.name, schema: UserRightsSchema },
    ]),
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    UsersModule,
  ],
  controllers: [SpeechController],
  providers: [
    SpeechService,
    RightsService,
    TerminalsService,
    STTProviderService,
    VoskProvider,
    WhisperProvider,
    AudioConverterService,
  ],
  exports: [SpeechService, RightsService, TerminalsService, STTProviderService],
})
export class SpeechModule {}
