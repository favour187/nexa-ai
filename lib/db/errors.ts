/**
 * Domain error types used across the data/API layer.
 */

export class ConfigurationError extends Error {
  constructor(message = "Required service is not configured") {
    super(message);
    this.name = "ConfigurationError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "Resource not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class AuthError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "AuthError";
  }
}
