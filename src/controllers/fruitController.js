const model = require('../models/fruitModel');
const stockModel = require('../models/stockModel');
const AppError = require('../utils/AppError');
const asyncHandler = require('../middleware/asyncHandler');
const { clean, cleanUpdate } = require('../middleware/validate');
const { FRUIT_STATUS } = require('../config/constants');

const schema = {
  fruit_name: { type: 'string', required: true, max: 60 },
  description: { type: 'string', max: 255 },
  status: { type: 'enum', values: FRUIT_STATUS, default: 'ACTIVE' },
};

exports.list = asyncHandler(async (req, res) => {
  const status = req.query.status
    ? clean(req.query, { status: { type: 'enum', values: FRUIT_STATUS } }).status
    : undefined;
  const data = await model.findAll(status);
  res.status(200).json({ success: true, count: data.length, data });
});

exports.get = asyncHandler(async (req, res) => {
  const fruit = await model.findById(req.params.id);
  if (!fruit) throw new AppError(404, `Fruit ${req.params.id} not found`, 'FRUIT_NOT_FOUND');
  res.status(200).json({ success: true, data: { ...fruit, stock: await stockModel.findByFruit(req.params.id) } });
});

exports.create = asyncHandler(async (req, res) => {
  const id = await model.create(clean(req.body, schema));
  res.status(201).json({ success: true, message: 'Fruit created', data: await model.findById(id) });
});

exports.update = asyncHandler(async (req, res) => {
  const data = cleanUpdate(req.body, schema);
  if (!(await model.findById(req.params.id))) throw new AppError(404, `Fruit ${req.params.id} not found`, 'FRUIT_NOT_FOUND');
  await model.update(req.params.id, data);
  res.status(200).json({ success: true, message: 'Fruit updated', data: await model.findById(req.params.id) });
});
