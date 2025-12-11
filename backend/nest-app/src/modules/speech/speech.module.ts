import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import {AppUsersModule} from '../auth/app-users.module';
import { SpeechController } from './speech.controller';
import { SpeechService } from './speech.service';
import { RightsService } from './rights.service';
import { TerminalsService } from './terminals.service';
import { STTProviderService } from './stt/stt.provider';
import { VoskProvider } from './stt/vosk.provider';
import { WhisperProvider } from './stt/whisper.provider';
import { AudioConverterService } from './stt/audio-converter.service';
import { SpeechHumanInput, SpeechTestInput } from '../speech-inputs/entities';
import { AppTerminal } from '../terminals/entities';
import { UserRights } from '../auth/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SpeechHumanInput,
      SpeechTestInput,
      AppTerminal,
      UserRights,
    ]),
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    AppUsersModule,
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
