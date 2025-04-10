const { ApiError } = require('../../errorHandler');
const { Puja } = require('../../models');

// Get All Pujas
const getAllPujas = async (req, res, next) => {
  try {
    const pujas = await Puja.find({})
    .sort({ _id: -1 })
    .populate('compulsoryProducts.productId optionalProducts.productId');  

    return res.status(200).json({
      success: true,
      message: 'Pujas fetched successfully',
      data: pujas,
    });
  } catch (error) {
    next(error);
  }
};

// Get Puja by ID
const getPujaById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const puja = await Puja.findById(id).populate('compulsoryProducts.productId optionalProducts.productId');
    if (!puja) {
      throw new ApiError('Puja not found', 404);
    }

    return res.status(200).json({
      success: true,
      message: 'Puja fetched successfully',
      data: puja,
    });
  } catch (error) {
    next(error);
  }
};



module.exports = {
  getAllPujas,
  getPujaById,
};