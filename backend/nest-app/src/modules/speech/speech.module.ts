import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SpeechController } from './speech.controller';
import { SpeechService } from './speech.service';
import { RightsService } from './rights.service';
import { TerminalsService } from './terminals.service';
import { HumanInput, HumanInputSchema } from './schemas/human-input.schema';
import { AppTerminal, AppTerminalSchema } from './schemas/app-terminal.schema';
import { UserRights, UserRightsSchema } from './schemas/user-rights.schema';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: HumanInput.name, schema: HumanInputSchema },
      { name: AppTerminal.name, schema: AppTerminalSchema },
      { name: UserRights.name, schema: UserRightsSchema },
    ]),
    UsersModule,
  ],
  controllers: [SpeechController],
  providers: [SpeechService, RightsService, TerminalsService],
  exports: [SpeechService, RightsService, TerminalsService],
})
export class SpeechModule {}
