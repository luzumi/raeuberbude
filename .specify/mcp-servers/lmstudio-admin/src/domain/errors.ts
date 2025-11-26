export type ErrorCode =
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'LMSTUDIO_HTTP_UNAVAILABLE'
  | 'LMSTUDIO_CLI_UNAVAILABLE'
  | 'LMSTUDIO_ERROR'
  | 'INTERNAL';

export class DomainError extends Error {
  readonly code: ErrorCode;
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

export class NotFoundError extends DomainError {
  constructor(message: string, details?: unknown) {
    super('NOT_FOUND', message, details);
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION', message, details);
  }
}

export class LmStudioUnavailableError extends DomainError {
  constructor(message: string, details?: unknown) {
    super('LMSTUDIO_HTTP_UNAVAILABLE', message, details);
  }
}

export class LmStudioError extends DomainError {
  constructor(message: string, details?: unknown) {
    super('LMSTUDIO_ERROR', message, details);
  }
}

