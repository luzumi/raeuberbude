// Shared transcript models for admin speech assistant

export interface Transcript {
  _id: string;
  userId: string;
  terminalId?: string;
  transcript: string;
  sttConfidence: number;
  aiAdjustedText?: string;
  suggestions?: string[];
  suggestionFlag?: boolean;
  category?: string;
  isValid?: boolean;
  confidence?: number;
  hasAmbiguity?: boolean;
  clarificationNeeded?: boolean;
  clarificationQuestion?: string;
  durationMs?: number;
  timings?: {
    sttMs?: number;
    preProcessMs?: number;
    llmMs?: number;
    dbMs?: number;
    networkMs?: number;
  };
  model?: string;
  llmProvider?: string;
  fallbackUsed?: boolean;
  error?: string;
  createdAt: string;
  assignedAreaId?: string;
  assignedDeviceId?: string;
  assignedEntityId?: string;
  assignedAction?: {
    type: string;
    label?: string;
    params?: any;
  };
  assignedTrigger?: string;
  assignedTriggerAt?: string;
  // Flag set by admin when marking a transcript as valid (persisted)
  manuallyValid?: boolean;
}

export interface Area {
  area_id: string;
  name: string;
  aliases?: string[];
}

export interface Entity {
  entity_id: string;
  state: string;
  attributes: any;
  friendly_name?: string;
}

export interface ActionDefinition {
  type: string;
  label: string;
  domain: string;
  service?: string;
  params?: ActionParam[];
}

export interface ActionParam {
  name: string;
  label: string;
  type: 'number' | 'slider' | 'color' | 'select' | 'text';
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: Array<{ value: any; label: string }>;
}

export interface Device {
  device_id: string;
  name?: string;
  area_id?: string;
  model?: string;
  manufacturer?: string;
  // Optional list of entity_ids that belong to this device
  entities?: string[];
}
