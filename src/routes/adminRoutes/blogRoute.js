const express = require("express");
const router = express.Router();
const { authenticateAdmin } = require("../../middlewares");

const {
  createBlog,
  updateBlog,
  deleteBlog,
  getAllBlogs,
  getBlogById,
  updateBlogStatus,
  getActiveBlogs,
} = require('../../controllers/admin/blogController');

router.post('/', authenticateAdmin, createBlog);
router.get('/:id', authenticateAdmin, getAllBlogs);
router.get('/:id', authenticateAdmin, getBlogById);
router.put('/:id', updateBlog);
router.delete('/:id', authenticateAdmin, deleteBlog);
router.patch('/:id/status', authenticateAdmin, updateBlogStatus);

module.exports = router;