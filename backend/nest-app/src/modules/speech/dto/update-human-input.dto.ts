import { PartialType } from '@nestjs/mapped-types';
import { CreateHumanInputDto } from './create-human-input.dto';
import { IsOptional, IsString, IsEnum, IsDate } from 'class-validator';

export class UpdateHumanInputDto extends PartialType(CreateHumanInputDto) {
  @IsOptional()
  @IsEnum(['pending', 'processed', 'failed'])
  status?: string;

  @IsOptional()
  @IsString()
  processedResponse?: string;

  @IsOptional()
  @IsDate()
  processedAt?: Date;
}
