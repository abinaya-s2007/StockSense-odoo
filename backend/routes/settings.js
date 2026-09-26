const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const controller = require('../controllers/settingsController');

router.use(auth);
router.get('/warehouses', controller.getWarehouses);
router.post('/warehouses', controller.createWarehouse);
router.put('/warehouses/:id', controller.updateWarehouse);
router.delete('/warehouses/:id', controller.deleteWarehouse);

router.get('/locations', controller.getLocations);
router.post('/locations', controller.createLocation);
router.delete('/locations/:id', controller.deleteLocation);

module.exports = router;
