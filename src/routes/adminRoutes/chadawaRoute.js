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

// Update chadawa status
router.put('/status/:id', authenticateAdmin, updateChadawaStatus);

// Update a chadawa
router.put('/:id', authenticateAdmin, updateChadawa);

// Delete a chadawa
router.delete('/:id', authenticateAdmin, deleteChadawa);

// Get all chadawa transactions
router.get('/getAllChadawaTransactions', authenticateAdmin, getAllChadawaTransactions);

// Get all chadawas with search and sorting
router.get('/', authenticateAdmin, getAllChadawas);

// Get a specific chadawa by ID
router.get('/:id', authenticateAdmin, getChadawaById);

module.exports = router;