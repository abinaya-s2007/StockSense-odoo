const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const controller = require('../controllers/dashboardController');

router.use(auth);
router.get('/', controller.getSummary);

module.exports = router;
