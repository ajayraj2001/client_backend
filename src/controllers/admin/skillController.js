const { Skill } = require('../../models');
const { ApiError } = require('../../errorHandler');

// Create a new skill
const createSkill = async (req, res, next) => {
  try {
    const { name } = req.body;

    const skill = new Skill({ name });
    await skill.save();

    return res.status(201).json({
      success: true,
      message: 'Skill created successfully',
      data: skill,
    });
  } catch (error) {
    next(error);
  }
};

// Update a skill
const updateSkill = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const skill = await Skill.findByIdAndUpdate(
      id,
      { name },
      { new: true }
    );

    if (!skill) {
      throw new ApiError('Skill not found', 404);
    }

    return res.status(200).json({
      success: true,
      message: 'Skill updated successfully',
      data: skill,
    });
  } catch (error) {
    next(error);
  }
};

// Delete a skill
const deleteSkill = async (req, res, next) => {
  try {
    const { id } = req.params;

    const skill = await Skill.findByIdAndDelete(id);
    if (!skill) {
      throw new ApiError('Skill not found', 404);
    }

    return res.status(200).json({
      success: true,
      message: 'Skill deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Get all skills
const getAllSkills = async (req, res, next) => {
  try {
    const skills = await Skill.find({});

    return res.status(200).json({
      success: true,
      message: 'Skills fetched successfully',
      data: skills,
    });
  } catch (error) {
    next(error);
  }
};

// Get a specific skill by ID
const getSkillById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const skill = await Skill.findById(id);
    if (!skill) {
      throw new ApiError('Skill not found', 404);
    }

    return res.status(200).json({
      success: true,
      message: 'Skill fetched successfully',
      data: skill,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSkill,
  updateSkill,
  deleteSkill,
  getAllSkills,
  getSkillById,
};