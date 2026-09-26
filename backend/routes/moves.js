const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const controller = require('../controllers/moveController');

router.use(auth);
router.get('/', controller.getAll);

module.exports = router;
