const express = require("express");
const router = express.Router();
const { getAllDashas, getSingleDasha } = require('../../controllers/vedhic/dashaController');

router.get('/', getAllDashas);
router.post('/single', getSingleDasha);

module.exports = router;