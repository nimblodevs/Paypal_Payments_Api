// ============================================================
// HTTP Request Logger
// Uses morgan to log every incoming request, but pipes the
// output through Winston so it's formatted consistently with
// the rest of our application logs (and rotated in production).
// ============================================================

import morgan from 'morgan';
import logger from '../config/logger.js';
import env from '../config/env.js';

// Redirect morgan's output stream into winston's "http" level
const stream = {
  write: (message) => logger.http(message.trim()),
};

// Skip noisy health-check logs in production to save space
const skip = (req) => env.isProduction && req.originalUrl === '/health';

// "dev" format is concise/colorized; "combined" is the standard
// Apache-style format that's more useful for production audits.
const format = env.isProduction
  ? ':remote-addr :method :url :status :res[content-length] - :response-time ms'
  : 'dev';

export default morgan(format, { stream, skip });
