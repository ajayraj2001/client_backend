const express = require("express");
const router = express.Router();
const { getAllDoshas, getSingleDosha } = require('../../controllers/vedhic/doshaController');

router.get('/', getAllDoshas);          // for all 4 doshas
router.post('/single', getSingleDosha);

module.exports = router;