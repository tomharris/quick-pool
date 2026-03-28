export class AqualinkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AqualinkError";
  }
}

export class AqualinkServiceError extends AqualinkError {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "AqualinkServiceError";
  }
}

export class AqualinkUnauthorizedError extends AqualinkServiceError {
  constructor(message = "Unauthorized") {
    super(message, 401);
    this.name = "AqualinkUnauthorizedError";
  }
}

export class AqualinkSystemOfflineError extends AqualinkError {
  constructor(serial: string) {
    super(`System ${serial} is offline`);
    this.name = "AqualinkSystemOfflineError";
  }
}

export class AqualinkInvalidParameterError extends AqualinkError {
  constructor(message: string) {
    super(message);
    this.name = "AqualinkInvalidParameterError";
  }
}
