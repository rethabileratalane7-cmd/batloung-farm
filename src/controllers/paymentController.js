const model = require('../models/paymentModel');
const AppError = require('../utils/AppError');
const asyncHandler = require('../middleware/asyncHandler');
const { clean } = require('../middleware/validate');
const { PAYMENT_METHODS } = require('../config/constants');

const schema = {
  amount: { type: 'number', required: true, min: 0.01, max: 999999999 },
  method: { type: 'enum', required: true, values: PAYMENT_METHODS },
  reference: { type: 'string', max: 60 },
};

/** POST /api/sales/:id/payments */
exports.paySale = asyncHandler(async (req, res) => {
  const result = await model.addToSale(req.params.id, clean(req.body, schema));
  res.status(201).json({ success: true, message: 'Payment recorded', data: result });
});

/** POST /api/vendors/:id/payments  (settles oldest unpaid sales first) */
exports.payVendor = asyncHandler(async (req, res) => {
  const result = await model.applyToVendor(req.params.id, clean(req.body, schema));
  res.status(201).json({ success: true, message: 'Payment applied to outstanding sales', data: result });
});

exports.listForSale = asyncHandler(async (req, res) => {
  const data = await model.findBySale(req.params.id);
  res.status(200).json({ success: true, count: data.length, data });
});
