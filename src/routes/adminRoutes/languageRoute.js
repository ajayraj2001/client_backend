const express = require('express');
const router = express.Router();
const {
  createLanguage,
  updateLanguage,
  deleteLanguage,
  getAllLanguages,
  getLanguageById,
} = require('../../controllers/admin/languageController');
const { authenticateAdmin } = require('../../middlewares');

// Create a new language
router.post('/', authenticateAdmin, createLanguage);

// Update a language
router.put('/:id', authenticateAdmin, updateLanguage);

// Delete a language
router.delete('/:id', authenticateAdmin, deleteLanguage);

// Get all languages
router.get('/', authenticateAdmin, getAllLanguages);

// Get a specific language by ID
router.get('/:id', authenticateAdmin, getLanguageById);

module.exports = router;