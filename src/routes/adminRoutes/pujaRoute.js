const express = require('express');
const router = express.Router();
const {
  createPuja,
  updatePuja,
  deletePuja,
  getAllPujas,
  getPujaById,
  updatePujaStatus
} = require('../../controllers/admin/pujaController');
const { authenticateAdmin } = require('../../middlewares');

// Create a new puja
router.post('/', authenticateAdmin, createPuja);

// Update a puja
router.put('/:id', authenticateAdmin, updatePuja);

// Delete a puja
router.delete('/:id', authenticateAdmin, deletePuja);

// Get all pujas with search and sorting
router.get('/', authenticateAdmin, getAllPujas);

// Get a specific puja by ID
router.get('/:id', authenticateAdmin, getPujaById);

router.put('/status/:id', authenticateAdmin, updatePujaStatus);

module.exports = router;