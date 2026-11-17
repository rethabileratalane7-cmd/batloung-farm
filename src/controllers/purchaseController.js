const model = require('../models/purchaseModel');
const AppError = require('../utils/AppError');
const asyncHandler = require('../middleware/asyncHandler');
const { clean, cleanItems } = require('../middleware/validate');
const { SIZES } = require('../config/constants');

const header = {
  supplier_id: { type: 'int', required: true, min: 1 },
  purchase_date: { type: 'date' },
};
const itemSchema = {
  fruit_id: { type: 'int', required: true, min: 1 },
  packaging_size: { type: 'enum', required: true, values: SIZES },
  quantity: { type: 'int', required: true, min: 1, max: 1000000 },
  unit_cost: { type: 'number', required: true, min: 0, max: 99999999 },
};

exports.list = asyncHandler(async (req, res) => {
  const data = await model.findAll();
  res.status(200).json({ success: true, count: data.length, data });
});

exports.get = asyncHandler(async (req, res) => {
  const data = await model.findById(req.params.id);
  if (!data) throw new AppError(404, `Purchase ${req.params.id} not found`, 'PURCHASE_NOT_FOUND');
  res.status(200).json({ success: true, data });
});

exports.create = asyncHandler(async (req, res) => {
  const h = clean(req.body, header);
  const items = cleanItems(req.body && req.body.items, itemSchema);
  const result = await model.record({ ...h, items });
  res.status(201).json({
    success: true,
    message: 'Purchase recorded and stock increased',
    data: await model.findById(result.purchase_id),
  });
});
