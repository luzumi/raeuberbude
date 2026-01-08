import { IsUUID, IsString, IsBoolean, IsOptional, IsObject } from 'class-validator';

/**
 * DTO zum Erstellen einer User-Device-Bindung
 */
export class CreateUserDeviceBindingDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  haDeviceId: string;

  @IsOptional()
  @IsString()
  customAlias?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO zum Aktualisieren einer User-Device-Bindung
 */
export class UpdateUserDeviceBindingDto {
  @IsOptional()
  @IsString()
  customAlias?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

