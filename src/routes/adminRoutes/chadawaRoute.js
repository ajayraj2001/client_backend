const express = require('express');
const router = express.Router();
const {
  createChadawa,
  updateChadawa,
  deleteChadawa,
  getAllChadawas,
  getChadawaById,
  updateChadawaStatus,
  getAllChadawaTransactions
} = require('../../controllers/admin/chadawaController.js');
const { authenticateAdmin } = require('../../middlewares');

// Create a new chadawa
router.post('/', authenticateAdmin, createChadawa);

router.get('/', getAllChadawas);
// Update chadawa status
router.put('/status/:id', updateChadawaStatus);

// Update a chadawa
router.put('/:id', authenticateAdmin, updateChadawa);

// Delete a chadawa
router.delete('/:id', deleteChadawa);

// Get all chadawa transactions
router.get('/getAllChadawaTransactions', authenticateAdmin, getAllChadawaTransactions);

// Get a specific chadawa by ID
router.get('/:id', getChadawaById);

module.exports = router;