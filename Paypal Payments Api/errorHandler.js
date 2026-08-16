// ============================================================
// Centralized Error Handling
//
// notFoundHandler  -> catches requests to undefined routes
// errorHandler     -> the single place where every error in the
//                     app (thrown, or passed via next(err)) is
//                     logged and turned into a client response.
//
// In production, internal error details (stack traces, raw
// messages) are never leaked to the client — only a generic
// message is sent, while full details go to the logs.
// ============================================================

import logger from '../config/logger.js';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';

export const notFoundHandler = (req, res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  let error = err;

  // Normalize any non-ApiError (e.g. a bug that throws a plain Error)
  // into an ApiError so the response shape stays consistent.
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    error = new ApiError(statusCode, error.message || 'Something went wrong', false);
  }

  const { statusCode, message, details, isOperational } = error;

  // Always log full detail server-side, including stack traces.
  // Operational errors (bad input, 404s) log at "warn"; genuine
  // bugs/crashes log at "error" so they stand out and can alert on-call.
  const logMeta = {
    statusCode,
    path: req.originalUrl,
    method: req.method,
    userId: req.user?.id,
    stack: err.stack,
  };

  if (isOperational) {
    logger.warn(message, logMeta);
  } else {
    logger.error(message, logMeta);
  }

  res.status(statusCode).json({
    success: false,
    message: isOperational ? message : 'Internal server error. Please try again later.',
    ...(details ? { errors: details } : {}),
    // Only include the stack trace in non-production environments
    ...(env.isProduction ? {} : { stack: err.stack }),
  });
};
