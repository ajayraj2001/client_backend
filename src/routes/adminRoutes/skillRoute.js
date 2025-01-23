const express = require('express');
const router = express.Router();
const {
  createSkill,
  updateSkill,
  deleteSkill,
  getAllSkills,
  getSkillById,
} = require('../../controllers/admin/skillController');
const { authenticateAdmin } = require('../../middlewares');

// Create a new skill
router.post('/', authenticateAdmin, createSkill);

// Update a skill
router.put('/:id', authenticateAdmin, updateSkill);

// Delete a skill
router.delete('/:id', authenticateAdmin, deleteSkill);

// Get all skills
router.get('/', authenticateAdmin, getAllSkills);

// Get a specific skill by ID
router.get('/:id', authenticateAdmin, getSkillById);

module.exports = router;