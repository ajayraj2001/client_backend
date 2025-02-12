const express = require('express');
const router = express.Router();

const {
    createSiteSettingData,
    getSiteSettingData,
} = require("../../controllers/admin/siteSettingConrtoller")

const { authenticateAdmin } = require('../../middlewares');

router.post('/:type', authenticateAdmin, createSiteSettingData);

router.get('/:type', authenticateAdmin, getSiteSettingData);

module.exports = router;