const router = require('express').Router();
const c = require('../controllers/fruitController');
const stock = require('../controllers/stockController');
const { validateId } = require('../middleware/validate');

router.get('/', c.list);
router.post('/', c.create);
router.get('/:id', validateId(), c.get);
router.put('/:id', validateId(), c.update);
router.get('/:id/stock', validateId(), stock.byFruit);

module.exports = router;
