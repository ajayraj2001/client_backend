const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../../middlewares");
const { getAllBlogs, getBlogById, getActiveBlogBySlug } = require("../../controllers/user/blogController");


router.get('/', getAllBlogs);

router.get('/:id', getBlogById);

router.get('/getBlogBySlug/:slug',  getActiveBlogBySlug);



module.exports = router;