const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const controller = require('../controllers/analyticsController');

router.use(auth);
router.get('/summary', controller.getSummary);
router.get('/trend', controller.getTrend);
router.get('/products', controller.getProducts);
router.get('/reorder', controller.getReorder);
router.get('/ledger', controller.getLedger);

module.exports = router;
