const { ApiError } = require('../../errorHandler');
const { Puja } = require('../../models');

// Get All Pujas
const getAllPujas = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 4;
    const skip = (page - 1) * limit;

    const { pujaType } = req.query;

    // Build filter object
    let filter = {};
    if (pujaType === 'daily') {
      filter.isRecurring = true;
    } else if (pujaType === 'occasionally') {
      filter.isRecurring = false;
    }

    const totalCount = await Puja.countDocuments(filter);
    const pujas = await Puja.find(filter)
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit)
      .select('title pujaImage slug displayedPrice actualPrice pujaDate shortDescription');

    return res.status(200).json({
      success: true,
      message: 'Pujas fetched successfully',
      pujaType,
      data: pujas,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
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