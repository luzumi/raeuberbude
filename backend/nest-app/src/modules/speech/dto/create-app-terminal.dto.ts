import { IsString, IsOptional, IsEnum, IsObject, IsMongoId, IsArray } from 'class-validator';

export class CreateAppTerminalDto {
  @IsString()
  terminalId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['browser', 'mobile', 'tablet', 'kiosk', 'smart-tv', 'other'])
  type?: string = 'browser';

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsObject()
  capabilities?: {
    hasMicrophone?: boolean;
    hasCamera?: boolean;
    hasSpeaker?: boolean;
    hasDisplay?: boolean;
    supportsSpeechRecognition?: boolean;
  };

  @IsOptional()
  @IsEnum(['active', 'inactive', 'maintenance'])
  status?: string = 'active';

  @IsOptional()
  @IsMongoId()
  assignedUserId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedActions?: string[] = [];

  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
