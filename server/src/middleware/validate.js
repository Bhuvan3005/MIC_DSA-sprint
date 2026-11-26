const mongoose = require('mongoose');
const AppError = require('../utils/AppError');

/** validate({ body, query, params }) with zod schemas. Parsed values replace the originals. */
const validate = (schemas) => (req, _res, next) => {
  for (const part of ['params', 'query', 'body']) {
    if (!schemas[part]) continue;
    const result = schemas[part].safeParse(req[part]);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
      return next(new AppError(400, 'Validation failed', 'VALIDATION', details));
    }
    if (part === 'query') Object.defineProperty(req, 'query', { value: result.data, writable: true, configurable: true });
    else req[part] = result.data;
  }
  next();
};

/** Rejects malformed ObjectIds before they reach Mongoose. */
const validObjectId = (...names) => (req, _res, next) => {
  for (const n of names) {
    if (!mongoose.isValidObjectId(req.params[n])) return next(new AppError(400, `Invalid ${n}`, 'VALIDATION'));
  }
  next();
};

module.exports = { validate, validObjectId };
