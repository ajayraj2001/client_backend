const express = require("express");
const router = express.Router();
const { getNumerology } = require('../../controllers/vedhic/predictionController');

router.get('/numerology', getNumerology);

module.exports = router;