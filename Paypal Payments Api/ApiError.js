// ============================================================
// ApiError
// A custom Error subclass used throughout the app so the
// centralized error handler can distinguish between expected,
// "operational" errors (bad input, not found, unauthorized)
// and genuine bugs/crashes.
// ============================================================

export default class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code to send
   * @param {string} message - Human-readable error message
   * @param {boolean} isOperational - true for expected/handled errors
   * @param {object|null} details - optional extra context (e.g. validation errors)
   */
  constructor(statusCode, message, isOperational = true, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, details = null) {
    return new ApiError(400, message, true, details);
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  static conflict(message = 'Conflict') {
    return new ApiError(409, message);
  }

  static tooManyRequests(message = 'Too many requests') {
    return new ApiError(429, message);
  }

  static internal(message = 'Internal server error') {
    return new ApiError(500, message, false);
  }
}
