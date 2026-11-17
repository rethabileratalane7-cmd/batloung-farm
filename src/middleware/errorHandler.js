const AppError = require('../utils/AppError');

const DB_DOWN_CODES = new Set([
  'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'EHOSTUNREACH', 'ECONNRESET',
  'PROTOCOL_CONNECTION_LOST', 'ER_CON_COUNT_ERROR', 'ER_ACCESS_DENIED_ERROR',
  'ER_BAD_DB_ERROR', 'ER_DBACCESS_DENIED_ERROR', 'POOL_CLOSED',
]);

/** 404 for unknown API routes. */
function notFound(req, res, next) {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`, 'ROUTE_NOT_FOUND'));
}

/** Central error handler: every error becomes a clean JSON response. */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  let status = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Unexpected server error. Please try again.';
  let details;

  if (err instanceof AppError) {
    ({ status, code, message, details } = err);
  } else if (err.type === 'entity.parse.failed') {
    status = 400; code = 'MALFORMED_JSON'; message = 'Request body is not valid JSON.';
  } else if (err.type === 'entity.too.large') {
    status = 413; code = 'PAYLOAD_TOO_LARGE'; message = 'Request body is too large.';
  } else if (DB_DOWN_CODES.has(err.code)) {
    status = 503; code = 'DATABASE_UNAVAILABLE';
    message = 'The database is currently unavailable. Please check the MySQL connection settings and try again.';
    console.error(`[db] ${err.code}: ${err.message}`);
  } else if (err.code === 'ER_DUP_ENTRY') {
    status = 409; code = 'DUPLICATE_RECORD';
    message = 'A record with the same unique value already exists.';
    details = [err.sqlMessage];
  } else if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    status = 409; code = 'RECORD_IN_USE';
    message = 'This record cannot be deleted because other records depend on it.';
  } else if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    status = 400; code = 'INVALID_REFERENCE';
    message = 'A referenced record (supplier, fruit or vendor) does not exist.';
  } else if (err.code === 'ER_CHECK_CONSTRAINT_VIOLATED' || err.errno === 4025 || err.errno === 3819 || err.code === 'ER_WARN_DATA_OUT_OF_RANGE' || err.code === 'ER_DATA_TOO_LONG') {
    status = 400; code = 'CONSTRAINT_VIOLATION';
    message = 'The data violates a database rule (e.g. negative stock or out-of-range value).';
    details = [err.sqlMessage];
  } else {
    console.error(`[error] ${req.method} ${req.originalUrl}`, err);
  }

  const body = { success: false, error: { code, message } };
  if (details) body.error.details = details;
  res.status(status).json(body);
}

module.exports = { notFound, errorHandler };
