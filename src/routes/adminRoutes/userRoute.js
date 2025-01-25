const express = require("express");
const router = express.Router();
const { authenticateAdmin } = require("../../middlewares");

const {
    getUsers
} = require("../../controllers/admin/userController");

router.post('/', authenticateAdmin, getUsers);
// router.put('/:id', authenticateAdmin, updateAstrologer);

module.exports = router;