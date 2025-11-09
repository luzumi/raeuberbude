import { IsMongoId, IsEnum, IsOptional, IsArray, IsBoolean, IsObject, IsDate, IsString } from 'class-validator';

export class CreateUserRightsDto {
  @IsMongoId()
  userId: string;

  @IsEnum(['admin', 'manager', 'regular', 'guest', 'terminal'])
  role: string = 'regular';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  allowedTerminals?: string[] = [];

  @IsOptional()
  @IsObject()
  restrictions?: {
    maxInputsPerDay?: number;
    maxInputLength?: number;
    allowedTimeRange?: {
      start: string;
      end: string;
    };
    blockedFeatures?: string[];
  };

  @IsOptional()
  @IsBoolean()
  canUseSpeechInput?: boolean = true;

  @IsOptional()
  @IsBoolean()
  canManageTerminals?: boolean = false;

  @IsOptional()
  @IsBoolean()
  canManageUsers?: boolean = false;

  @IsOptional()
  @IsBoolean()
  canViewOwnInputs?: boolean = true;

  @IsOptional()
  @IsBoolean()
  canViewAllInputs?: boolean = false;

  @IsOptional()
  @IsBoolean()
  canDeleteInputs?: boolean = false;

  @IsOptional()
  @IsDate()
  expiresAt?: Date;

  @IsOptional()
  @IsEnum(['active', 'suspended', 'revoked'])
  status?: string = 'active';

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
