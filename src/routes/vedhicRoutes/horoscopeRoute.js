const express = require("express");
const router = express.Router();
const { getChartImages } = require('../../controllers/vedhic/horoscopeController');

router.get('/chart', getChartImages);

module.exports = router;