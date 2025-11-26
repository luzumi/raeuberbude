export class DomainError extends Error {
    constructor(code, message, details) {
        super(message);
        this.code = code;
        this.details = details;
    }
}
export class NotFoundError extends DomainError {
    constructor(message, details) {
        super('NOT_FOUND', message, details);
    }
}
export class ValidationError extends DomainError {
    constructor(message, details) {
        super('VALIDATION', message, details);
    }
}
export class LmStudioUnavailableError extends DomainError {
    constructor(message, details) {
        super('LMSTUDIO_HTTP_UNAVAILABLE', message, details);
    }
}
export class LmStudioError extends DomainError {
    constructor(message, details) {
        super('LMSTUDIO_ERROR', message, details);
    }
}
