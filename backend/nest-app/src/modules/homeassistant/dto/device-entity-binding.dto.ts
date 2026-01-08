import { IsUUID, IsString, IsBoolean, IsOptional, IsInt, IsEnum, IsObject } from 'class-validator';

/**
 * DTO zum Erstellen einer Device-Entity-Bindung
 */
export class CreateDeviceEntityBindingDto {
  @IsUUID()
  haDeviceId: string;

  @IsString()
  haEntityId: string;

  @IsOptional()
  @IsEnum(['auto', 'manual', 'suggested'])
  bindingType?: 'auto' | 'manual' | 'suggested';

  @IsOptional()
  @IsString()
  customCategory?: string;

  @IsOptional()
  @IsInt()
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO zum Aktualisieren einer Device-Entity-Bindung
 */
export class UpdateDeviceEntityBindingDto {
  @IsOptional()
  @IsEnum(['auto', 'manual', 'suggested'])
  bindingType?: 'auto' | 'manual' | 'suggested';

  @IsOptional()
  @IsString()
  customCategory?: string;

  @IsOptional()
  @IsInt()
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

