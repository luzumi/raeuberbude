import { IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';

// NOTE: Used by /api/speech/validate controller endpoint.
export class ValidateTranscriptDto {
  @IsString()
  transcript: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  confidence?: number;

  @IsOptional()
  @IsObject()
  context?: {
    location?: string;
    userId?: string;
    terminalId?: string;
  };
}
