const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../../middlewares");
const { getAllBlogs, getBlogById, getActiveBlogBySlug } = require("../../controllers/user/blogController");


router.get('/blogs', getAllBlogs);

router.get('/blogs/:id', getBlogById);

router.get('/getBlogBySlug/:slug',  getActiveBlogBySlug);



module.exports = router;