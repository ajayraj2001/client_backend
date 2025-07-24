const express = require('express');
const router = express.Router();
const {
  getAllChadawas,
  getChadawaById,
  getChadawaBySlug
} = require('../../controllers/user/chadawaController.js');
const { authenticateUser } = require('../../middlewares');

// Get all chadawas with search and sorting
router.get('/', getAllChadawas);

// Get a specific chadawa by slug
router.get('/slug/:slug', getChadawaBySlug);

// Get a specific chadawa by ID
router.get('/:id', getChadawaById);

module.exports = router;