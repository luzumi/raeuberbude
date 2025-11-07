import { PartialType } from '@nestjs/mapped-types';
import { CreateAppTerminalDto } from './create-app-terminal.dto';
import { IsOptional, IsDate } from 'class-validator';

export class UpdateAppTerminalDto extends PartialType(CreateAppTerminalDto) {
  @IsOptional()
  @IsDate()
  lastActiveAt?: Date;
}
