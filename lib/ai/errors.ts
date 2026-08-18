/** Typed errors for the AI layer. Mapped from Featherless/OpenAI-SDK failures. */

export class AiError extends Error {
  constructor(
    message: string,
    public override cause?: unknown,
  ) {
    super(message);
    this.name = "AiError";
  }
}

export class AiConfigurationError extends AiError {
  constructor(message = "Featherless AI is not configured") {
    super(message);
    this.name = "AiConfigurationError";
  }
}

export class AiResponseError extends AiError {
  constructor(
    message = "AI returned an invalid response",
    public issues?: unknown,
  ) {
    super(message);
    this.name = "AiResponseError";
  }
}

export class AiTimeoutError extends AiError {
  constructor(message = "AI request timed out") {
    super(message);
    this.name = "AiTimeoutError";
  }
}

export class AiRateLimitError extends AiError {
  constructor(message = "AI rate limit reached") {
    super(message);
    this.name = "AiRateLimitError";
  }
}

export class AiNetworkError extends AiError {
  constructor(message = "Network error contacting the AI service") {
    super(message);
    this.name = "AiNetworkError";
  }
}

export class AiServiceError extends AiError {
  constructor(
    message = "AI service error",
    public status?: number,
  ) {
    super(message);
    this.name = "AiServiceError";
  }
}

/**
 * Map a thrown AiError (or unknown error) to an HTTP status + user-friendly
 * message. Never offers a fake/fallback plan — only a clear, retryable error.
 */
export function describeAiError(error: unknown): {
  status: number;
  message: string;
} {
  if (error instanceof AiConfigurationError) {
    return { status: 503, message: "AI planning is not configured." };
  }
  if (error instanceof AiRateLimitError) {
    return {
      status: 429,
      message: "The AI service is busy. Please try again shortly.",
    };
  }
  if (error instanceof AiTimeoutError) {
    return {
      status: 504,
      message: "The AI service took too long to respond. Please try again.",
    };
  }
  if (error instanceof AiNetworkError) {
    return { status: 502, message: "Could not reach the AI service." };
  }
  if (error instanceof AiResponseError) {
    return {
      status: 502,
      message: "The AI returned a plan we could not use. Please try again.",
    };
  }
  if (error instanceof AiServiceError) {
    return {
      status: 502,
      message: "The AI service reported an error. Please try again.",
    };
  }
  return { status: 502, message: "Plan generation failed. Please try again." };
}
