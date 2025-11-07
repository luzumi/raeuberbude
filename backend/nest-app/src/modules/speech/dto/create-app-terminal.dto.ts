import { IsString, IsOptional, IsIn, IsObject, IsMongoId, IsArray } from 'class-validator';

export class CreateAppTerminalDto {
  @IsString()
  terminalId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(['browser', 'mobile', 'tablet', 'kiosk', 'smart-tv', 'other'])
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
  @IsIn(['active', 'inactive', 'maintenance'])
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
