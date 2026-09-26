const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const controller = require('../controllers/dashboardController');

router.use(auth);
router.get('/', controller.getSummary);
router.get('/low-stock', controller.getLowStock);

module.exports = router;
