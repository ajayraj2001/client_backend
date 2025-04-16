const { ApiError } = require('../../errorHandler');
const { Puja } = require('../../models');

// Get All Pujas
const getAllPujas = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1; // default page = 1
    const limit = parseInt(req.query.limit) || 4; // default limit = 10
    const skip = (page - 1) * limit;

    const totalCount = await Puja.countDocuments();
    const pujas = await Puja.find({})
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit)
      .select('title pujaImage slug displayedPrice actualPrice pujaDate shortDescription');

    return res.status(200).json({
      success: true,
      message: 'Pujas fetched successfully',
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