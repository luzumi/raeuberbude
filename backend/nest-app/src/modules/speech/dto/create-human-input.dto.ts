import { IsString, IsOptional, IsIn, IsObject, IsMongoId } from 'class-validator';

export class CreateHumanInputDto {
  @IsMongoId()
  userId: string;

  @IsOptional()
  @IsMongoId()
  terminalId?: string;

  @IsString()
  inputText: string;

  @IsOptional()
  @IsIn(['speech', 'text', 'gesture'])
  inputType?: string = 'speech';

  @IsOptional()
  @IsObject()
  context?: {
    location?: string;
    device?: string;
    browser?: string;
    sessionId?: string;
    confidence?: number;
  };

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
