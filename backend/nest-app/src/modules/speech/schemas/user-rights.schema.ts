import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserRightsDocument = UserRights & Document;

@Schema({ timestamps: true })
export class UserRights {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ 
    type: String, 
    enum: ['admin', 'manager', 'regular', 'guest', 'terminal'], 
    required: true,
    default: 'regular'
  })
  role: string;

  @Prop({ type: [String], default: [] })
  permissions: string[];

  @Prop({ type: [Types.ObjectId], ref: 'AppTerminal', default: [] })
  allowedTerminals: Types.ObjectId[];

  @Prop({ type: Object })
  restrictions?: {
    maxInputsPerDay?: number;
    maxInputLength?: number;
    allowedTimeRange?: {
      start: string; // HH:mm format
      end: string;   // HH:mm format
    };
    blockedFeatures?: string[];
  };

  @Prop({ type: Boolean, default: true })
  canUseSpeechInput: boolean;

  @Prop({ type: Boolean, default: false })
  canManageTerminals: boolean;

  @Prop({ type: Boolean, default: false })
  canManageUsers: boolean;

  @Prop({ type: Boolean, default: true })
  canViewOwnInputs: boolean;

  @Prop({ type: Boolean, default: false })
  canViewAllInputs: boolean;

  @Prop({ type: Boolean, default: false })
  canDeleteInputs: boolean;

  @Prop({ type: Date })
  expiresAt?: Date;

  @Prop({ type: String, enum: ['active', 'suspended', 'revoked'], default: 'active' })
  status: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const UserRightsSchema = SchemaFactory.createForClass(UserRights);

// Indexes
UserRightsSchema.index({ userId: 1 });
UserRightsSchema.index({ role: 1 });
UserRightsSchema.index({ status: 1 });
UserRightsSchema.index({ expiresAt: 1 });

// Static permission definitions
export const PERMISSIONS = {
  // Speech Input Permissions
  SPEECH_USE: 'speech.use',
  SPEECH_VIEW_OWN: 'speech.view.own',
  SPEECH_VIEW_ALL: 'speech.view.all',
  SPEECH_DELETE: 'speech.delete',
  
  // Terminal Management
  TERMINAL_VIEW: 'terminal.view',
  TERMINAL_CREATE: 'terminal.create',
  TERMINAL_EDIT: 'terminal.edit',
  TERMINAL_DELETE: 'terminal.delete',
  TERMINAL_ASSIGN: 'terminal.assign',
  
  // User Management
  USER_VIEW: 'user.view',
  USER_CREATE: 'user.create',
  USER_EDIT: 'user.edit',
  USER_DELETE: 'user.delete',
  USER_MANAGE_RIGHTS: 'user.manage.rights',
  
  // System
  SYSTEM_ADMIN: 'system.admin',
  SYSTEM_MONITOR: 'system.monitor',
  SYSTEM_LOGS: 'system.logs',
};

// Role-based default permissions
export const ROLE_PERMISSIONS = {
  admin: Object.values(PERMISSIONS),
  manager: [
    PERMISSIONS.SPEECH_USE,
    PERMISSIONS.SPEECH_VIEW_OWN,
    PERMISSIONS.SPEECH_VIEW_ALL,
    PERMISSIONS.TERMINAL_VIEW,
    PERMISSIONS.TERMINAL_EDIT,
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.USER_MANAGE_RIGHTS,
    PERMISSIONS.SYSTEM_MONITOR,
  ],
  regular: [
    PERMISSIONS.SPEECH_USE,
    PERMISSIONS.SPEECH_VIEW_OWN,
    PERMISSIONS.TERMINAL_VIEW,
  ],
  guest: [
    PERMISSIONS.SPEECH_USE,
    PERMISSIONS.SPEECH_VIEW_OWN,
  ],
  terminal: [
    PERMISSIONS.SPEECH_USE,
  ],
};
