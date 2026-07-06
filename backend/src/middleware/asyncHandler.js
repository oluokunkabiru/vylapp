// Wraps an async route handler so thrown errors/rejected promises reach
// the error middleware instead of crashing the process.
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
