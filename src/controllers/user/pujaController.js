const { ApiError } = require('../../errorHandler');
const { Puja, PujaReview } = require('../../models');

// const getAllPujas = async (req, res, next) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     //const limit = parseInt(req.query.limit) || 9;
//     const limit =  9;
//     const skip = (page - 1) * limit;
//     const { search, lang = 'en' } = req.query;

//     const now = new Date();
//     const filter = {};

//     if (search) {
//       filter.$or = [
//         { title: { $regex: search, $options: 'i' } },
//         { titleHindi: { $regex: search, $options: 'i' } }
//       ];
//     }

//     // Fetch all pujas matching the filter
//     const allPujas = await Puja.find(filter)
//       .select('title titleHindi pujaImage slug displayedPrice location locationHindi rating actualPrice pujaDate shortDescription shortDescriptionHindi isPopular')
//       .lean();

//     // Split into popular and non-popular
//     const popularPujas = allPujas
//       .filter(puja => puja.isPopular && puja.pujaDate && new Date(puja.pujaDate) >= now)
//       .sort((a, b) => new Date(a.pujaDate) - new Date(b.pujaDate));

//     const normalPujas = allPujas
//       .filter(puja => !puja.isPopular && puja.pujaDate && new Date(puja.pujaDate) >= now)
//       .sort((a, b) => new Date(a.pujaDate) - new Date(b.pujaDate));

//     const sortedPujas = [...popularPujas, ...normalPujas];

//     const paginatedPujas = sortedPujas.slice(skip, skip + limit);

//     const transformed = paginatedPujas.map(puja => ({
//       _id: puja._id,
//       title: lang === "hi" ? puja.titleHindi : puja.title,
//       slug: puja.slug,
//       pujaImage: puja.pujaImage,
//       displayedPrice: puja.displayedPrice,
//       location:  lang === "hi" ? puja.locationHindi : puja.location,
//       rating: puja.rating,
//       actualPrice: puja.actualPrice,
//       pujaDate: puja.pujaDate,
//       shortDescription: lang === 'hi' ? puja.shortDescriptionHindi : puja.shortDescription,
//       isPopular: puja.isPopular,
//     }));

//     return res.status(200).json({
//       success: true,
//       message: 'Pujas fetched successfully',
//       data: transformed,
//       pagination: {
//         total: sortedPujas.length,
//         page,
//         limit,
//         totalPages: Math.ceil(sortedPujas.length / limit),
//       },
//     });
//   } catch (error) {
//     next(error);
//   }
// };


const getAllPujas = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 9;
    const skip = (page - 1) * limit;
    const { search, lang = 'en' } = req.query;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const twoPM = new Date(today);
    twoPM.setHours(14, 0, 0, 0); // 2:00 PM

    const filter = {
      status: 'Active',
      $expr: {
        $or: [
          { $gt: ['$pujaDate', today] }, // Future dates
          { $and: [
            { $eq: [{ $dateToString: { format: "%Y-%m-%d", date: "$pujaDate" } }, today.toISOString().slice(0, 10)] },
            { $lt: [now, twoPM] } // Only before 2PM for today
          ]}
        ]
      }
    };

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { titleHindi: { $regex: search, $options: 'i' } }
      ];
    }

    const allPujas = await Puja.find(filter)
      .select('title titleHindi pujaImage slug displayedPrice location locationHindi rating actualPrice pujaDate shortDescription shortDescriptionHindi isPopular')
      .lean();

    const popularPujas = allPujas
      .filter(puja => puja.isPopular)
      .sort((a, b) => new Date(a.pujaDate) - new Date(b.pujaDate));

    const normalPujas = allPujas
      .filter(puja => !puja.isPopular)
      .sort((a, b) => new Date(a.pujaDate) - new Date(b.pujaDate));

    const sortedPujas = [...popularPujas, ...normalPujas];
    const paginatedPujas = sortedPujas.slice(skip, skip + limit);

    const transformed = paginatedPujas.map(puja => ({
      _id: puja._id,
      title: lang === "hi" ? puja.titleHindi : puja.title,
      slug: puja.slug,
      pujaImage: puja.pujaImage,
      displayedPrice: puja.displayedPrice,
      location: lang === "hi" ? puja.locationHindi : puja.location,
      rating: puja.rating,
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
    const lang = req.query.lang || 'en';

    const puja = await Puja.findOne({ slug });

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
      isPopular: puja.isPopular,
      status: puja.status,
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
      offerings: puja.offerings.map(o => ({
        _id: o._id,
        header: getField(o.header, o.headerHindi),
        description: getField(o.description, o.descriptionHindi),
        price: o.price,
        image: o.image
      }))
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

const getPujaById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const lang = req.query.lang || 'en';

    const puja = await Puja.findById(id)

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
      isPopular: puja.isPopular,
      status: puja.status,
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
      offerings: puja.offerings.map(o => ({
        _id: o._id,
        header: getField(o.header, o.headerHindi),
        description: getField(o.description, o.descriptionHindi),
        price: o.price,
        image: o.image
      }))
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

module.exports = {
  getAllPujas,
  getPujaById,
  getPujaBySlug
};
