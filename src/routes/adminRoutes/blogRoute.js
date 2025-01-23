const express = require("express");
const router = express.Router();
const { authenticateAdmin } = require("../../middlewares");
const {
  createBlog,
  updateBlog,
  deleteBlog,
  getAllBlogs,
  getBlogById,
} = require("../../controllers/admin/blogController");

// Blog management routes
router.post('/', authenticateAdmin, createBlog);
router.put('/:id', authenticateAdmin, updateBlog);
router.delete('/:id', authenticateAdmin, deleteBlog);
router.get('/', authenticateAdmin, getAllBlogs);
router.get('/:id', authenticateAdmin, getBlogById);

module.exports = router;