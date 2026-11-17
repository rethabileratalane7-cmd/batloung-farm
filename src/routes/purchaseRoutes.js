const router = require('express').Router();
const c = require('../controllers/purchaseController');
const { validateId } = require('../middleware/validate');

router.get('/', c.list);
router.post('/', c.create);
router.get('/:id', validateId(), c.get);

module.exports = router;
