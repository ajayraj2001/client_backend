const express = require('express');
const router = express.Router();
const {
  getAllPujas,
  getPujaById,
} = require('../../controllers/user/pujaController');
const { authenticateUser } = require('../../middlewares');

// Get all pujas with search and sorting
router.get('/', getAllPujas);

// Get a specific puja by ID
router.get('/:id', getPujaById);


module.exports = router;