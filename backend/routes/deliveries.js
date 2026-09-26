const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const controller = require('../controllers/deliveryController');

router.use(auth);
router.get('/', controller.getAll);
router.get('/:id', controller.getOne);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.patch('/:id/status', controller.setStatus);
router.delete('/:id', controller.remove);

module.exports = router;
