import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ValidateIntentDto {
  @ApiProperty({ description: 'Transcript text to validate' })
  @IsString()
  transcript: string;

  @ApiProperty({ description: 'STT confidence score (0-1)' })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @ApiPropertyOptional({ description: 'User ID for context' })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ description: 'Current location/page for context' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ description: 'Previous inputs for context' })
  @IsOptional()
  previousInputs?: string[];
}
