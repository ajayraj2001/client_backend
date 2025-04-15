const express = require("express");
const router = express.Router();
const { authenticateAdmin } = require("../../middlewares");
const {
  getAllCategories,
  getCategoryById,
} = require("../../controllers/admin/categoryController");

router.get('/', authenticateAdmin, getAllCategories);
router.get('/:id', authenticateAdmin, getCategoryById);

module.exports = router;