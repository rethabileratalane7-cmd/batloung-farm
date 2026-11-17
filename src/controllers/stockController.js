const model = require('../models/stockModel');
const fruitModel = require('../models/fruitModel');
const AppError = require('../utils/AppError');
const asyncHandler = require('../middleware/asyncHandler');
const { clean } = require('../middleware/validate');
const { SIZES, DEFAULT_LOW_STOCK } = require('../config/constants');

exports.list = asyncHandler(async (req, res) => {
  const data = await model.findAll();
  res.status(200).json({ success: true, count: data.length, data });
});

exports.low = asyncHandler(async (req, res) => {
  const { threshold } = clean(req.query, { threshold: { type: 'int', min: 0, default: DEFAULT_LOW_STOCK } });
  const data = await model.findLow(threshold);
  res.status(200).json({ success: true, threshold, count: data.length, data });
});

exports.byFruit = asyncHandler(async (req, res) => {
  if (!(await fruitModel.findById(req.params.id))) throw new AppError(404, `Fruit ${req.params.id} not found`, 'FRUIT_NOT_FOUND');
  const data = await model.findByFruit(req.params.id);
  res.status(200).json({ success: true, count: data.length, data });
});

exports.prices = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: await model.getPrices() });
});

exports.setPrice = asyncHandler(async (req, res) => {
  const { size } = clean(req.params, { size: { type: 'enum', required: true, values: SIZES } });
  const { selling_price } = clean(req.body, { selling_price: { type: 'number', required: true, min: 0.01, max: 99999999 } });
  await model.setPrice(size, selling_price);
  res.status(200).json({ success: true, message: 'Price updated', data: await model.getPrices() });
});
