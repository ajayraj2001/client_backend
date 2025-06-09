const { ApiError } = require('../../errorHandler');
const { Puja, PujaReview } = require('../../models');

// Get All Pujas
// const getAllPujas = async (req, res, next) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     const skip = (page - 1) * limit;

//     const { pujaType, search } = req.query;

//     // Build filter object
//     let filter = {};
//     if (pujaType === 'daily') {
//       filter.isRecurring = true;
//     } else if (pujaType === 'occasionally') {
//       filter.isRecurring = false;
//     }

//     if (search) {
//       filter.title = { $regex: search, $options: 'i' }; // case-insensitive search
//     }

//     const totalCount = await Puja.countDocuments(filter);
//     const pujas = await Puja.find(filter)
//       .sort({ _id: -1 })
//       .skip(skip)
//       .limit(limit)
//       .select('title pujaImage slug displayedPrice actualPrice pujaDate shortDescription');

//     return res.status(200).json({
//       success: true,
//       message: 'Pujas fetched successfully',
//       data: pujas,
//       pagination: {
//         total: totalCount,
//         page,
//         limit,
//         totalPages: Math.ceil(totalCount / limit),
//       },
//     });
//   } catch (error) {
//     next(error);
//   }
// };

const getAllPujas = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { search, lang = 'en' } = req.query;

    const now = new Date();
    const filter = {};

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { titleHindi: { $regex: search, $options: 'i' } }
      ];
    }

    // Fetch all pujas matching the filter
    const allPujas = await Puja.find(filter)
      .select('title titleHindi pujaImage slug displayedPrice actualPrice pujaDate shortDescription shortDescriptionHindi isPopular')
      .lean();

    // Split into popular and non-popular
    const popularPujas = allPujas
      .filter(puja => puja.isPopular && puja.pujaDate && new Date(puja.pujaDate) >= now)
      .sort((a, b) => new Date(a.pujaDate) - new Date(b.pujaDate));

    const normalPujas = allPujas
      .filter(puja => !puja.isPopular && puja.pujaDate && new Date(puja.pujaDate) >= now)
      .sort((a, b) => new Date(a.pujaDate) - new Date(b.pujaDate));

    const sortedPujas = [...popularPujas, ...normalPujas];

    const paginatedPujas = sortedPujas.slice(skip, skip + limit);

    const transformed = paginatedPujas.map(puja => ({
      _id: puja._id,
      title: lang === "hi" ? puja.titleHindi : puja.title,
      slug: puja.slug,
      pujaImage: puja.pujaImage,
      displayedPrice: puja.displayedPrice,
      actualPrice: puja.actualPrice,
      pujaDate: puja.pujaDate,
      shortDescription: lang === 'hi' ? puja.shortDescriptionHindi : puja.shortDescription,
      isPopular: puja.isPopular,
    }));

    return res.status(200).json({
      success: true,
      message: 'Pujas fetched successfully',
      data: transformed,
      pagination: {
        total: sortedPujas.length,
        page,
        limit,
        totalPages: Math.ceil(sortedPujas.length / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

const getPujaBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const lang = req.query.lang || 'en'; // default to English

    const puja = await Puja.findOne({ slug })

    if (!puja) {
      throw new ApiError('Puja not found', 404);
    }

    const reviews = await PujaReview.find({ pujaId: puja._id, status: 'Active' })
      .populate('userId', 'name profile_img')
      .sort({ created_at: -1 })
      .limit(5);

    const getField = (en, hi) => (lang === 'hi' ? hi : en);

    const formatted = {
      _id: puja._id,
      title: getField(puja.title, puja.titleHindi),
      pujaImage: puja.pujaImage,
      slug: puja.slug,
      displayedPrice: puja.displayedPrice,
      actualPrice: puja.actualPrice,
      rating: puja.rating,
      bannerImages: puja.bannerImages,
      pujaDate: puja.pujaDate,
      location: getField(puja.location, puja.locationHindi),
      aboutPuja: getField(puja.aboutPuja, puja.aboutPujaHindi),
      shortDescription: getField(puja.shortDescription, puja.shortDescriptionHindi),
      compulsoryProducts: puja.compulsoryProducts,
      optionalProducts: puja.optionalProducts,
      isPopular: puja.isPopular,
      packages: puja.packages,
      benefits: puja.benefits.map(b => ({
        header: getField(b.header, b.headerHindi),
        description: getField(b.description, b.descriptionHindi)
      })),
      pujaProcess: puja.pujaProcess.map(p => ({
        stepNumber: p.stepNumber,
        title: getField(p.title, p.titleHindi),
        description: getField(p.description, p.descriptionHindi)
      })),
      faq: puja.faq.map(f => ({
        question: getField(f.question, f.questionHindi),
        answer: getField(f.answer, f.answerHindi)
      })),
    };

    return res.status(200).json({
      success: true,
      message: 'Puja fetched successfully',
      data: {
        puja: formatted,
        latestReviews: reviews,
      },
    });
  } catch (error) {
    next(error);
  }
};




// const getPujaBySlug = async (req, res, next) => {
//   try {
//     const { slug } = req.params;

//     const puja = await Puja.findOne({ slug })
//       .populate('compulsoryProducts', 'name')
//       .populate('optionalProducts', 'name');

//     if (!puja) {
//       throw new ApiError('Puja not found', 404);
//     }

//     const reviews = await PujaReview.find({ pujaId: puja._id, status: 'Active' })
//       .populate('userId', 'name profile_img')
//       .sort({ created_at: -1 })
//       .limit(5);

//     return res.status(200).json({
//       success: true,
//       message: 'Puja fetched successfully',
//       data: {
//         puja,
//         latestReviews: reviews,
//       },
//     });
//   } catch (error) {
//     next(error);
//   }
// };


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