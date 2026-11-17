const router = require('express').Router();
const c = require('../controllers/stockController');

router.get('/', c.list);
router.get('/low', c.low);
router.get('/prices', c.prices);
router.put('/prices/:size', c.setPrice);

module.exports = router;
