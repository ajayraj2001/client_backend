const express = require("express");
const router = express.Router();
const { authenticateAdmin } = require("../../middlewares");

const {
    getUsers,
    updateUserStatus
} = require("../../controllers/admin/userController");

router.get('/', authenticateAdmin, getUsers);
router.put('/:id/status', authenticateAdmin, updateUserStatus);

module.exports = router;