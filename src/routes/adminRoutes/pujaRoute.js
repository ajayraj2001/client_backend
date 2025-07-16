const express = require('express');
const router = express.Router();
const {
  createPuja,
  updatePuja,
  deletePuja,
  getAllPujas,
  getPujaById,
  updatePujaStatus,
  getAllPujaTransactions
} = require('../../controllers/admin/pujaController');
const { authenticateAdmin } = require('../../middlewares');

// Create a new puja
router.post('/', authenticateAdmin, createPuja);

router.put('/status/:id', authenticateAdmin, updatePujaStatus);

// Update a puja
router.put('/:id', authenticateAdmin, updatePuja);

// Delete a puja
router.delete('/:id', authenticateAdmin, deletePuja);

router.get('/getAllPujaTransactions',authenticateAdmin, getAllPujaTransactions)

// Get all pujas with search and sorting
router.get('/', authenticateAdmin, getAllPujas);

// Get a specific puja by ID
router.get('/:id', authenticateAdmin, getPujaById);


module.exports = router;