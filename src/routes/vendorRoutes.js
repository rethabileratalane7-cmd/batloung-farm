const router = require('express').Router();
const c = require('../controllers/vendorController');
const pay = require('../controllers/paymentController');
const { validateId } = require('../middleware/validate');

router.get('/', c.list);                       // ?search=name-or-phone
router.post('/', c.create);
router.get('/balances', c.balances);           // outstanding balance of every vendor
router.get('/:id', validateId(), c.get);
router.put('/:id', validateId(), c.update);
router.get('/:id/balance', validateId(), c.balance);
router.post('/:id/payments', validateId(), pay.payVendor);

module.exports = router;
