const model = require('../models/reportModel');
const AppError = require('../utils/AppError');
const asyncHandler = require('../middleware/asyncHandler');
const { clean } = require('../middleware/validate');
const { DEFAULT_LOW_STOCK } = require('../config/constants');

const ok = (res, data) => res.status(200).json({ success: true, data });

exports.topFruits = asyncHandler(async (req, res) => ok(res, await model.topFruits()));
exports.stockLevels = asyncHandler(async (req, res) => ok(res, await model.stockLevels()));

exports.revenue = asyncHandler(async (req, res) => {
  const { from, to } = clean(req.query, {
    from: { type: 'date', required: true },
    to: { type: 'date', required: true },
  });
  if (from > to) throw new AppError(400, 'Validation failed', 'VALIDATION_ERROR', ['from must not be after to']);
  ok(res, { from, to, ...(await model.revenueBetween(from, to)) });
});

exports.topVendor = asyncHandler(async (req, res) => {
  const ranking = await model.topVendors(5);
  ok(res, { top_vendor: ranking[0] || null, ranking });
});

exports.summary = asyncHandler(async (req, res) => ok(res, await model.summary(DEFAULT_LOW_STOCK)));
