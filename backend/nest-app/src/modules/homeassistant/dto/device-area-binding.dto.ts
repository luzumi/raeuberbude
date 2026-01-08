import { IsUUID, IsBoolean, IsOptional, IsDateString, IsObject } from 'class-validator';

/**
 * DTO zum Erstellen einer Device-Area-Bindung
 */
export class CreateDeviceAreaBindingDto {
  @IsUUID()
  haDeviceId: string;

  @IsUUID()
  haAreaId: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsBoolean()
  isTemporary?: boolean;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO zum Aktualisieren einer Device-Area-Bindung
 */
export class UpdateDeviceAreaBindingDto {
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsBoolean()
  isTemporary?: boolean;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

