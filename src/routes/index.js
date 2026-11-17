const router = require('express').Router();
const { testConnection } = require('../config/db');

router.get('/health', async (req, res) => {
  const db = await testConnection();
  res.status(db.ok ? 200 : 503).json({ success: db.ok, status: db.ok ? 'ok' : 'degraded', database: db.message });
});

router.use('/suppliers', require('./supplierRoutes'));
router.use('/fruits', require('./fruitRoutes'));
router.use('/stock', require('./stockRoutes'));
router.use('/vendors', require('./vendorRoutes'));
router.use('/purchases', require('./purchaseRoutes'));
router.use('/sales', require('./saleRoutes'));
router.use('/reports', require('./reportRoutes'));

module.exports = router;
