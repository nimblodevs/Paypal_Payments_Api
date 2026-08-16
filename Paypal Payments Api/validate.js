// ============================================================
// Validation Middleware
// Executes an array of express-validator validation chains and,
// if any fail, short-circuits the request with a clean 400
// error listing every field-level problem. Keeps controllers
// free of manual validation logic.
// ============================================================

import { validationResult } from 'express-validator';
import ApiError from '../utils/ApiError.js';

/**
 * @param {import('express-validator').ValidationChain[]} validations
 */
const validate = (validations) => async (req, res, next) => {
  // Run all validators concurrently
  await Promise.all(validations.map((validation) => validation.run(req)));

  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  const formattedErrors = errors.array().map((err) => ({
    field: err.path,
    message: err.msg,
  }));

  next(ApiError.badRequest('Validation failed', formattedErrors));
};

export default validate;
