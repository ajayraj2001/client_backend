const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../../middlewares");
const {
  getAllCategories,
  getCategoryById,
} = require("../../controllers/user/categoryController");

router.get('/', authenticateUser, getAllCategories);
router.get('/:id', authenticateUser, getCategoryById);

module.exports = router;