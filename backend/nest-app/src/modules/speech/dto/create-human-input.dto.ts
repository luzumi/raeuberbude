import { IsString, IsOptional, IsIn, IsObject, IsUUID, Matches } from 'class-validator';

export class CreateHumanInputDto {
  @IsString()
  @IsUUID()
  userId: string;

  @IsOptional()
  // Kann entweder eine interne UUID oder eine "public" Terminal-ID (Slug/Name) sein.
  // Public-ID Pattern ist absichtlich restriktiv, um Müllwerte zu vermeiden.
  @Matches(/^(?:[0-9a-f-]{36}|[A-z0-9_-]{2,64})$/i, {
      message: 'terminalId must be a UUID or a short public terminal id (2-64 chars, [A-Za-z0-9_-])',
  })
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
