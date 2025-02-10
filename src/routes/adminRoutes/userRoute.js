const express = require("express");
const router = express.Router();
const { authenticateAdmin } = require("../../middlewares");

const {
    getUsers,
    updateUserStatus,
    getWalletHistory
} = require("../../controllers/admin/userController");

router.get('/', authenticateAdmin, getUsers);
router.put('/:id/status', authenticateAdmin, updateUserStatus);
router.put('/getWalletHistory/:id', authenticateAdmin, getWalletHistory);

module.exports = router;