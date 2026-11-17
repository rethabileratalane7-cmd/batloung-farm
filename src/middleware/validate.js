const AppError = require('../utils/AppError');

const isBlank = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

/**
 * Validates and cleans an object against a schema.
 * Rule fields: type (string|int|number|enum|date), required, min, max,
 * values (enum), pattern, msg, default.
 * Throws AppError(400) listing every problem. Returns only known fields.
 */
function clean(input, schema, prefix = '') {
  const out = {};
  const errors = [];
  const source = input && typeof input === 'object' ? input : {};

  for (const [field, rule] of Object.entries(schema)) {
    const label = `${prefix}${field}`;
    let v = source[field];

    if (isBlank(v)) {
      if (rule.required) errors.push(`${label} is required`);
      else if (rule.default !== undefined) out[field] = rule.default;
      continue;
    }
    if (typeof v === 'object' || typeof v === 'boolean') {
      errors.push(`${label} has an invalid value`);
      continue;
    }

    switch (rule.type) {
      case 'string': {
        v = String(v).trim();
        if (rule.max && v.length > rule.max) errors.push(`${label} must be at most ${rule.max} characters`);
        else if (rule.pattern && !rule.pattern.test(v)) errors.push(rule.msg || `${label} is invalid`);
        else out[field] = v;
        break;
      }
      case 'int':
      case 'number': {
        const n = Number(v);
        const ok = Number.isFinite(n) && (rule.type === 'number' || Number.isInteger(n));
        if (!ok) errors.push(`${label} must be ${rule.type === 'int' ? 'a whole number' : 'a number'}`);
        else if (rule.min !== undefined && n < rule.min) errors.push(`${label} must be at least ${rule.min}`);
        else if (rule.max !== undefined && n > rule.max) errors.push(`${label} must be at most ${rule.max}`);
        else out[field] = n;
        break;
      }
      case 'enum': {
        const match = rule.values.find((x) => x.toLowerCase() === String(v).trim().toLowerCase());
        if (!match) errors.push(`${label} must be one of: ${rule.values.join(', ')}`);
        else out[field] = match;
        break;
      }
      case 'date': {
        const s = String(v).trim();
        const d = new Date(`${s}T00:00:00Z`);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) {
          errors.push(`${label} must be a valid date in YYYY-MM-DD format`);
        } else out[field] = s;
        break;
      }
      default:
        errors.push(`${label} has an unsupported rule`);
    }
  }

  if (errors.length) throw new AppError(400, 'Validation failed', 'VALIDATION_ERROR', errors);
  return out;
}

/** Same schema but every field optional (for PUT updates). At least one field required. */
function asOptional(schema) {
  const copy = {};
  for (const [k, r] of Object.entries(schema)) copy[k] = { ...r, required: false, default: undefined };
  return copy;
}

function cleanUpdate(input, schema) {
  const data = clean(input, asOptional(schema));
  if (Object.keys(data).length === 0) {
    throw new AppError(400, 'Validation failed', 'VALIDATION_ERROR', ['Provide at least one field to update']);
  }
  return data;
}

/** Validates an array of line items (purchase / sale items). */
function cleanItems(items, schema, max = 100) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError(400, 'Validation failed', 'VALIDATION_ERROR', ['items must be a non-empty array']);
  }
  if (items.length > max) {
    throw new AppError(400, 'Validation failed', 'VALIDATION_ERROR', [`items cannot contain more than ${max} lines`]);
  }
  const errors = [];
  const result = [];
  items.forEach((item, i) => {
    try {
      result.push(clean(item, schema, `items[${i}].`));
    } catch (e) {
      errors.push(...e.details);
    }
  });
  if (errors.length) throw new AppError(400, 'Validation failed', 'VALIDATION_ERROR', errors);
  return result;
}

/** latitude and longitude must be given together (a map pin needs both). */
function requirePair(d) {
  if ((d.latitude === undefined) !== (d.longitude === undefined)) {
    throw new AppError(400, 'Validation failed', 'VALIDATION_ERROR', ['latitude and longitude must be provided together']);
  }
}

/** Route middleware: validates :param (default :id) is a positive integer. */
const validateId = (param = 'id') => (req, res, next) => {
  const n = Number(req.params[param]);
  if (!Number.isInteger(n) || n <= 0) {
    return next(new AppError(400, `${param} must be a positive whole number`, 'INVALID_ID'));
  }
  req.params[param] = n;
  next();
};

module.exports = { clean, cleanUpdate, cleanItems, validateId, requirePair };
