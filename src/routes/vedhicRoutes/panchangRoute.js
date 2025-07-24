const express = require('express');
const router = express.Router();
const { getPanchangOnly, getFestival } = require('../../controllers/vedhic/panchangController.js');

router.post('/', getPanchangOnly);
router.post('/festival', getFestival);

module.exports = router;
