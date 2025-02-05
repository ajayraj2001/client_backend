const express = require("express");
const router = express.Router();
const { authenticateAdmin } = require("../../middlewares");
const {
  createCategory,
  updateCategory,
  deleteCategory,
  getAllCategories,
  getCategoryById,
} = require("../../controllers/admin/categoryController");

router.post('/', authenticateAdmin, createCategory);
router.put('/:id', authenticateAdmin, updateCategory);
router.delete('/:id', authenticateAdmin, deleteCategory);
router.get('/', authenticateAdmin, getAllCategories);
router.get('/:id', authenticateAdmin, getCategoryById);

module.exports = router;