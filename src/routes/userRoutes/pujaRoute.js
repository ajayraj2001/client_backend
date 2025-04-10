const express = require('express');
const router = express.Router();
const {
  getAllPujas,
  getPujaById,
} = require('../../controllers/admin/pujaController');
const { authenticateUser } = require('../../middlewares');

// Get all pujas with search and sorting
router.get('/', authenticateUser, getAllPujas);

// Get a specific puja by ID
router.get('/:id', authenticateUser, getPujaById);


module.exports = router;