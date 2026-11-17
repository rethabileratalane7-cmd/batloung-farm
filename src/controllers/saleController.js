const model = require('../models/saleModel');
const AppError = require('../utils/AppError');
const asyncHandler = require('../middleware/asyncHandler');
const { clean, cleanItems } = require('../middleware/validate');
const { SIZES, SALE_PAYMENT_CHOICES } = require('../config/constants');

const header = { vendor_id: { type: 'int', required: true, min: 1 } };
// No price or total accepted: the server looks the price up by packaging size.
const itemSchema = {
  fruit_id: { type: 'int', required: true, min: 1 },
  packaging_size: { type: 'enum', required: true, values: SIZES },
  quantity: { type: 'int', required: true, min: 1, max: 1000000 },
};
const paymentSchema = {
  method: { type: 'enum', required: true, values: SALE_PAYMENT_CHOICES },
  amount: { type: 'number', min: 0.01, max: 999999999 },
  reference: { type: 'string', max: 60 },
};

exports.list = asyncHandler(async (req, res) => {
  const f = clean(req.query, {
    vendor_id: { type: 'int', min: 1 },
    status: { type: 'enum', values: ['PAID', 'PARTIALLY_PAID', 'UNPAID'] },
  });
  const data = await model.findAll(f);
  res.status(200).json({ success: true, count: data.length, data });
});

exports.get = asyncHandler(async (req, res) => {
  const data = await model.findById(req.params.id);
  if (!data) throw new AppError(404, `Sale ${req.params.id} not found`, 'SALE_NOT_FOUND');
  res.status(200).json({ success: true, data });
});

exports.create = asyncHandler(async (req, res) => {
  const h = clean(req.body, header);
  const items = cleanItems(req.body && req.body.items, itemSchema);
  const payment = req.body && req.body.payment ? clean(req.body.payment, paymentSchema, 'payment.') : undefined;
  const saleId = await model.record({ ...h, items, payment });
  res.status(201).json({
    success: true,
    message: 'Sale recorded and stock reduced',
    data: await model.findById(saleId),
  });
});
