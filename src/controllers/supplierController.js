const model = require('../models/supplierModel');
const AppError = require('../utils/AppError');
const asyncHandler = require('../middleware/asyncHandler');
const { clean, cleanUpdate, requirePair } = require('../middleware/validate');
const { PROVINCES } = require('../config/constants');

const schema = {
  business_name: { type: 'string', required: true, max: 120 },
  contact_person: { type: 'string', required: true, max: 100 },
  phone: { type: 'string', required: true, max: 20, pattern: /^\+?[0-9 ()-]{7,20}$/, msg: 'phone must be a valid phone number' },
  province: { type: 'enum', required: true, values: PROVINCES },
  address: { type: 'string', required: true, max: 255 },
  latitude: { type: 'number', min: -90, max: 90 },
  longitude: { type: 'number', min: -180, max: 180 },
};

exports.list = asyncHandler(async (req, res) => {
  const province = req.query.province
    ? clean(req.query, { province: { type: 'enum', values: PROVINCES } }).province
    : undefined;
  const data = await model.findAll(province);
  res.status(200).json({ success: true, count: data.length, data });
});

exports.get = asyncHandler(async (req, res) => {
  const data = await model.details(req.params.id);
  if (!data) throw new AppError(404, `Supplier ${req.params.id} not found`, 'SUPPLIER_NOT_FOUND');
  res.status(200).json({ success: true, data });
});

exports.create = asyncHandler(async (req, res) => {
  const d = clean(req.body, schema);
  requirePair(d);
  const id = await model.create(d);
  res.status(201).json({ success: true, message: 'Supplier created', data: await model.findById(id) });
});

exports.update = asyncHandler(async (req, res) => {
  const data = cleanUpdate(req.body, schema);
  requirePair(data);
  if (!(await model.findById(req.params.id))) throw new AppError(404, `Supplier ${req.params.id} not found`, 'SUPPLIER_NOT_FOUND');
  await model.update(req.params.id, data);
  res.status(200).json({ success: true, message: 'Supplier updated', data: await model.findById(req.params.id) });
});

exports.remove = asyncHandler(async (req, res) => {
  if (!(await model.findById(req.params.id))) throw new AppError(404, `Supplier ${req.params.id} not found`, 'SUPPLIER_NOT_FOUND');
  if ((await model.countPurchases(req.params.id)) > 0) {
    throw new AppError(409, 'This supplier has purchase records and cannot be deleted.', 'RECORD_IN_USE');
  }
  await model.remove(req.params.id);
  res.status(200).json({ success: true, message: 'Supplier deleted' });
});
