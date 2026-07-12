const { fail } = require("../utils/respond");
const logger    = require("../utils/logger");

class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function notFound(req, res) {
  return fail(res, 404, `No route for ${req.method} ${req.originalUrl}`);
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const status = err.status || 500;
  if (status >= 500) {
    logger.error(`${req.method} ${req.originalUrl} — ${err.message}`, {
      status,
      stack: err.stack,
      body:  req.body,
    });
  }
  return fail(res, status, err.message || "Internal server error", err.details);
}

module.exports = { ApiError, notFound, errorHandler };
