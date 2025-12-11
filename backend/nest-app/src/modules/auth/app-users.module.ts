import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {AppUsersService} from './app-users.service';

// Entities
import { User, UserRights, UserAllowedTerminal } from './entities';

// Placeholder service/controller names — the project may provide concrete
// implementations elsewhere. We register the providers/controllers if they
// exist at runtime; otherwise the module still compiles and can be extended.
import { AppUsersController } from './app-users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserRights, UserAllowedTerminal])],
  controllers: [AppUsersController],
  providers: [AppUsersService],
  exports: [AppUsersService],
})
export class AppUsersModule {}

