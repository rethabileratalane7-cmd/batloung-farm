const router = require('express').Router();
const c = require('../controllers/saleController');
const pay = require('../controllers/paymentController');
const { validateId } = require('../middleware/validate');

router.get('/', c.list);
router.post('/', c.create);
router.get('/:id', validateId(), c.get);
router.get('/:id/payments', validateId(), pay.listForSale);
router.post('/:id/payments', validateId(), pay.paySale);

module.exports = router;
