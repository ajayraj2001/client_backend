const express = require("express");
const router = express.Router();
const { getAllExtendedHoroscope, getSingleExtendedHoroscope } = require('../../controllers/vedhic/extendedHoroscopeController');

router.get('/', getAllExtendedHoroscope);          // for all 4 doshas
router.post('/single', getSingleExtendedHoroscope);

module.exports = router;