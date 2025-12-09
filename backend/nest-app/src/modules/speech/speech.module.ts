import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { SpeechController } from './speech.controller';
import { SpeechService } from './speech.service';
import { RightsService } from './rights.service';
import { TerminalsService } from './terminals.service';
import { STTProviderService } from './stt/stt.provider';
import { VoskProvider } from './stt/vosk.provider';
import { WhisperProvider } from './stt/whisper.provider';
import { AudioConverterService } from './stt/audio-converter.service';
import { SpeechHumanInput } from '../speech-inputs/entities/speech-human-input.entity';
import { SpeechTestInput } from '../speech-inputs/entities/speech-test-input.entity';
import { AppTerminalEntity } from './entities/app-terminal.entity';
import { UserRights } from '../auth/entities/user-rights.entity';
import { UsersModule } from '../../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SpeechHumanInput,
      SpeechTestInput,
      AppTerminalEntity,
      UserRights,
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
