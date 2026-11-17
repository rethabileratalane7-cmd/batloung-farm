const router = require('express').Router();
const c = require('../controllers/supplierController');
const { validateId } = require('../middleware/validate');

router.get('/', c.list);
router.post('/', c.create);
router.get('/:id', validateId(), c.get);
router.put('/:id', validateId(), c.update);
router.delete('/:id', validateId(), c.remove);

module.exports = router;
