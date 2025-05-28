const { ApiError } = require('../../errorHandler');
const { Puja, PujaReview } = require('../../models');

// Get All Pujas
const getAllPujas = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { pujaType, search } = req.query;

    // Build filter object
    let filter = {};
    if (pujaType === 'daily') {
      filter.isRecurring = true;
    } else if (pujaType === 'occasionally') {
      filter.isRecurring = false;
    }

    if (search) {
      filter.title = { $regex: search, $options: 'i' }; // case-insensitive search
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


const getPujaBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const puja = await Puja.findOne({ slug })
      .populate('compulsoryProducts', 'name')
      .populate('optionalProducts', 'name');

    if (!puja) {
      throw new ApiError('Puja not found', 404);
    }

    const reviews = await PujaReview.find({ pujaId: puja._id, status: 'Active' })
      .populate('userId', 'name profile_img')
      .sort({ created_at: -1 })
      .limit(5);

    return res.status(200).json({
      success: true,
      message: 'Puja fetched successfully',
      data: {
        puja,
        latestReviews: reviews,
      },
    });
  } catch (error) {
    next(error);
  }
};


const getPujaById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Fetch the puja with populated products
    const puja = await Puja.findById(id)
      .populate('compulsoryProducts.productId')
      .populate('optionalProducts.productId');

    if (!puja) {
      throw new ApiError('Puja not found', 404);
    }

    // Fetch latest 5 reviews for the puja
    const reviews = await PujaReview.find({ pujaId: id, status: 'Active' })
      .populate('userId', 'name profile_img') // Include user info like name/avatar
      .sort({ created_at: -1 })
      .limit(5);

    return res.status(200).json({
      success: true,
      message: 'Puja fetched successfully',
      data: {
        puja,
        latestReviews: reviews,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllPujas,
  getPujaById,
  getPujaBySlug
};