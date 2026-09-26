const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const controller = require('../controllers/transferController');

router.use(auth);
router.get('/', controller.getAll);
router.post('/', controller.create);
router.patch('/:id/status', controller.setStatus);

module.exports = router;
