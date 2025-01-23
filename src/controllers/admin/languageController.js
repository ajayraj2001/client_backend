const { Language } = require('../../models');
const { ApiError } = require('../../errorHandler');

// Create a new language
const createLanguage = async (req, res, next) => {
  try {
    const { name } = req.body;

    const language = new Language({ name });
    await language.save();

    return res.status(201).json({
      success: true,
      message: 'Language created successfully',
      data: language,
    });
  } catch (error) {
    next(error);
  }
};

// Update a language
const updateLanguage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const language = await Language.findByIdAndUpdate(
      id,
      { name },
      { new: true }
    );

    if (!language) {
      throw new ApiError('Language not found', 404);
    }

    return res.status(200).json({
      success: true,
      message: 'Language updated successfully',
      data: language,
    });
  } catch (error) {
    next(error);
  }
};

// Delete a language
const deleteLanguage = async (req, res, next) => {
  try {
    const { id } = req.params;

    const language = await Language.findByIdAndDelete(id);
    if (!language) {
      throw new ApiError('Language not found', 404);
    }

    return res.status(200).json({
      success: true,
      message: 'Language deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Get all languages
const getAllLanguages = async (req, res, next) => {
  try {
    const languages = await Language.find({});

    return res.status(200).json({
      success: true,
      message: 'Languages fetched successfully',
      data: languages,
    });
  } catch (error) {
    next(error);
  }
};

// Get a specific language by ID
const getLanguageById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const language = await Language.findById(id);
    if (!language) {
      throw new ApiError('Language not found', 404);
    }

    return res.status(200).json({
      success: true,
      message: 'Language fetched successfully',
      data: language,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createLanguage,
  updateLanguage,
  deleteLanguage,
  getAllLanguages,
  getLanguageById,
};