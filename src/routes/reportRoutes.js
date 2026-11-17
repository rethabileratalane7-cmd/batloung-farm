const router = require('express').Router();
const c = require('../controllers/reportController');

router.get('/summary', c.summary);
router.get('/top-fruits', c.topFruits);
router.get('/revenue', c.revenue);        // ?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/top-vendor', c.topVendor);
router.get('/stock-levels', c.stockLevels);

module.exports = router;
