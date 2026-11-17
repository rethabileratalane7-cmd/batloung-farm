const model = require('../models/vendorModel');
const AppError = require('../utils/AppError');
const asyncHandler = require('../middleware/asyncHandler');
const { clean, cleanUpdate, requirePair } = require('../middleware/validate');

const schema = {
  vendor_name: { type: 'string', required: true, max: 120 },
  phone_number: { type: 'string', required: true, max: 20, pattern: /^\+?[0-9 ()-]{7,20}$/, msg: 'phone_number must be a valid phone number' },
  location: { type: 'string', required: true, max: 150 },
  registration_date: { type: 'date' },
  latitude: { type: 'number', min: -90, max: 90 },
  longitude: { type: 'number', min: -180, max: 180 },
};

exports.list = asyncHandler(async (req, res) => {
  const q = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const data = q ? await model.search(q) : await model.findAll();
  res.status(200).json({ success: true, count: data.length, data });
});

exports.get = asyncHandler(async (req, res) => {
  const data = await model.balanceFor(req.params.id); // vendor details + sales/balance summary
  if (!data) throw new AppError(404, `Vendor ${req.params.id} not found`, 'VENDOR_NOT_FOUND');
  const vendor = await model.findById(req.params.id);
  res.status(200).json({ success: true, data: { ...vendor, ...data } });
});

exports.create = asyncHandler(async (req, res) => {
  const d = clean(req.body, schema);
  requirePair(d);
  const id = await model.create(d);
  res.status(201).json({ success: true, message: 'Vendor registered', data: await model.findById(id) });
});

exports.update = asyncHandler(async (req, res) => {
  const data = cleanUpdate(req.body, schema);
  requirePair(data);
  if (!(await model.findById(req.params.id))) throw new AppError(404, `Vendor ${req.params.id} not found`, 'VENDOR_NOT_FOUND');
  await model.update(req.params.id, data);
  res.status(200).json({ success: true, message: 'Vendor updated', data: await model.findById(req.params.id) });
});

exports.balances = asyncHandler(async (req, res) => {
  const data = await model.balances();
  res.status(200).json({ success: true, count: data.length, data });
});

exports.balance = asyncHandler(async (req, res) => {
  const data = await model.balanceFor(req.params.id);
  if (!data) throw new AppError(404, `Vendor ${req.params.id} not found`, 'VENDOR_NOT_FOUND');
  res.status(200).json({ success: true, data });
});
