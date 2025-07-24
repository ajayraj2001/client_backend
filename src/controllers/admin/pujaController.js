const { ApiError } = require('../../errorHandler');
const { Puja , PujaTransaction} = require('../../models');
const slugify = require('slugify')
const { getMultipleFilesUploader, deleteFile } = require('../../middlewares');

// Multer setup for puja image uploads
const uploadPujaFiles = getMultipleFilesUploader([
  { name: 'pujaImage', folder: 'puja_images', maxCount: 1 }, // Single puja image
  { name: 'bannerImages', folder: 'puja_banners', maxCount: 6 }, // Multiple banner images (max 5)
  { name: 'offeringsImages', folder: 'puja_offerings', maxCount: 10 }
]);

const createPuja = async (req, res, next) => {
  uploadPujaFiles(req, res, async (err) => {
    if (err) {
      console.error('Multer Error:', err);
      return next(new ApiError(err.message, 400));
    }

    let pujaImagePath = '';
    let bannerImagePaths = [];

    try {
      const {
        title,
        titleHindi,
        slug,
        aboutPuja,
        aboutPujaHindi,
        shortDescription,
        shortDescriptionHindi,
        location,
        locationHindi,
        benefits,
        pujaProcess,
        faq,
        packages,
        status,
        displayedPrice,
        actualPrice,
        // isRecurring,
        pujaDate
      } = req.body;

      const finalSlug = slug || slugify(title, { lower: true, strict: true });

      const existing = await Puja.findOne({ slug: finalSlug });
      if (existing) {
        return next(new ApiError('Slug already exists, please choose another one', 400));
      }

      const isPopular = req.body.isPopular === 'true';
      // const parsedBoolean = isRecurring === 'true';
      // const finalDate = parsedBoolean ? null : pujaDate;

      if (req.files?.pujaImage) {
        pujaImagePath = `/puja_images/${req.files.pujaImage[0].filename}`;
      }
      if (req.files?.bannerImages) {
        bannerImagePaths = req.files.bannerImages.map(file => `/puja_banners/${file.filename}`);
      }

      const offerings = req.body.offerings ? JSON.parse(req.body.offerings) : [];
      if (offerings.length && req.files?.offeringsImages) {
        const offeringImages = req.files.offeringsImages;

        offerings.forEach((offering, index) => {
          if (offeringImages[index]) {
            offering.image = `/puja_offerings/${offeringImages[index].filename}`;
          }
        });
      }

      const puja = new Puja({
        title,
        titleHindi,
        slug: finalSlug,
        pujaDate,
        aboutPuja,
        aboutPujaHindi,
        shortDescription,
        shortDescriptionHindi,
        location,
        locationHindi,
        displayedPrice,
        actualPrice,
        status,
        isPopular,
        // isRecurring: parsedBoolean,
        pujaImage: pujaImagePath,
        bannerImages: bannerImagePaths,
        benefits: benefits ? JSON.parse(benefits) : [],
        pujaProcess: pujaProcess ? JSON.parse(pujaProcess) : [],
        faq: faq ? JSON.parse(faq) : [],
        packages: packages ? JSON.parse(packages) : [],
        offerings,
      });

      await puja.save();

      const populatedPuja = await Puja.findById(puja._id)

      return res.status(201).json({
        success: true,
        message: 'Puja created successfully',
        data: populatedPuja,
      });

    } catch (error) {
      console.log('ereore', error)
      if (pujaImagePath) await deleteFile(pujaImagePath);
      if (bannerImagePaths.length > 0) {
        await Promise.all(bannerImagePaths.map(path => deleteFile(path)));
      }
      next(error);
    }
  });
};

// Delete Puja
const updatePuja = async (req, res, next) => {
  uploadPujaFiles(req, res, async (err) => {
    if (err) {
      console.error('Multer Error:', err);
      return next(new ApiError(err.message, 400));
    }

    let pujaImagePath = '';
    let bannerImagePaths = [];

    try {
      const { id } = req.params;

      const {
        title,
        titleHindi,
        slug,
        aboutPuja,
        aboutPujaHindi,
        shortDescription,
        shortDescriptionHindi,
        location,
        locationHindi,
        benefits,
        pujaProcess,
        faq,
        packages,
        status,
        displayedPrice,
        actualPrice,
        pujaDate,
      } = req.body;

      const existingPuja = await Puja.findById(id);
      if (!existingPuja) throw new ApiError('Puja not found', 404);

      let finalSlug = slug || existingPuja.slug;
      if (slug && slug !== existingPuja.slug) {
        finalSlug = slugify(slug, { lower: true, strict: true });
        const duplicate = await Puja.findOne({ slug: finalSlug, _id: { $ne: id } });
        if (duplicate) {
          return next(new ApiError('Slug already exists, choose a unique one', 400));
        }
      }

      if (req.files?.pujaImage) {
        pujaImagePath = `/puja_images/${req.files.pujaImage[0].filename}`;
      }
      if (req.files?.bannerImages) {
        bannerImagePaths = req.files.bannerImages.map(file => `/puja_banners/${file.filename}`);
      }

      // Parse new offerings
      let newOfferings = req.body.offerings ? JSON.parse(req.body.offerings) : [];
      const existingOfferings = existingPuja.offerings || [];
      const offeringImages = req.files?.offeringsImages || [];

      let finalOfferings = [];
      let newImageIndex = 0;

      // Track deleted offerings to clean up images
      const existingOfferingIds = existingOfferings.map(o => o._id.toString());
      const incomingOfferingIds = newOfferings.filter(o => o._id).map(o => o._id);
      const deletedOfferingIds = existingOfferingIds.filter(id => !incomingOfferingIds.includes(id));

      // Delete images for deleted offerings
      for (const delId of deletedOfferingIds) {
        const old = existingOfferings.find(o => o._id.toString() === delId);
        if (old?.image) {
          await deleteFile(old.image);
        }
      }

      // Process offerings
      for (const offering of newOfferings) {
        // Existing offering (retain image)
        if (offering._id) {
          const match = existingOfferings.find(o => o._id.toString() === offering._id);
          finalOfferings.push({
            ...offering,
            image: match?.image || '',
          });
        } else {
          // New offering (attach image if present)
          const imageFile = offeringImages[newImageIndex++];
          finalOfferings.push({
            ...offering,
            image: imageFile ? `/puja_offerings/${imageFile.filename}` : '',
          });
        }
      }


      // === ✅ Build Final Update Data ===
      const updateData = {
        title: title || existingPuja.title,
        titleHindi: titleHindi || existingPuja.titleHindi,
        slug: finalSlug,
        pujaDate: pujaDate || existingPuja.pujaDate,
        aboutPuja: aboutPuja || existingPuja.aboutPuja,
        aboutPujaHindi: aboutPujaHindi || existingPuja.aboutPujaHindi,
        shortDescription: shortDescription || existingPuja.shortDescription,
        shortDescriptionHindi: shortDescriptionHindi || existingPuja.shortDescriptionHindi,
        location: location || existingPuja.location,
        locationHindi: locationHindi || existingPuja.locationHindi,
        displayedPrice: displayedPrice || existingPuja.displayedPrice,
        actualPrice: actualPrice || existingPuja.actualPrice,
        status: status || existingPuja.status,
        isPopular: 'isPopular' in req.body ? req.body.isPopular === 'true' : existingPuja.isPopular,
        pujaImage: pujaImagePath || existingPuja.pujaImage,
        bannerImages: bannerImagePaths.length > 0 ? bannerImagePaths : existingPuja.bannerImages,
        benefits: benefits ? JSON.parse(benefits) : existingPuja.benefits,
        pujaProcess: pujaProcess ? JSON.parse(pujaProcess) : existingPuja.pujaProcess,
        faq: faq ? JSON.parse(faq) : existingPuja.faq,
        packages: packages ? JSON.parse(packages) : existingPuja.packages,
        offerings: finalOfferings,
      };

      const updatedPuja = await Puja.findByIdAndUpdate(id, updateData, { new: true });
      if (!updatedPuja) throw new ApiError('Error updating puja', 500);

      // Delete old puja image if replaced
      if (req.files?.pujaImage && existingPuja.pujaImage) {
        await deleteFile(existingPuja.pujaImage);
      }

      // Delete old banner images if replaced
      if (req.files?.bannerImages && existingPuja.bannerImages.length > 0) {
        await Promise.all(existingPuja.bannerImages.map(path => deleteFile(path)));
      }

      return res.status(200).json({
        success: true,
        message: 'Puja updated successfully',
        data: updatedPuja,
      });

    } catch (error) {
      if (pujaImagePath) await deleteFile(pujaImagePath);
      if (bannerImagePaths.length > 0) {
        await Promise.all(bannerImagePaths.map(path => deleteFile(path)));
      }
      next(error);
    }
  });
};

const deletePuja = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find and delete the puja
    const puja = await Puja.findByIdAndDelete(id);
    if (!puja) {
      throw new ApiError('Puja not found', 404);
    }

    // Delete associated files
    if (puja.pujaImage) {
      await deleteFile(puja.pujaImage);
    }
    if (puja.bannerImages.length > 0) {
      await Promise.all(puja.bannerImages.map(path => deleteFile(path)));
    }

    return res.status(200).json({
      success: true,
      message: 'Puja deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Get All Pujas
const getAllPujas = async (req, res, next) => {
  try {
    const pujas = await Puja.find({})
      .sort({ _id: -1 })

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

    const puja = await Puja.findById(id);
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

const updatePujaStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    if (!['Active', 'Inactive'].includes(status)) {
      throw new ApiError('Invalid status', 400);
    }

    // Find and update the astrologer status
    const puja = await Puja.findByIdAndUpdate(id, { status }, { new: true });

    if (!puja) {
      throw new ApiError('Puja not found', 404);
    }

    return res.status(200).json({
      success: true,
      message: 'Puja status updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

const getAllPujaTransactions = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = '', status } = req.query;

    const skip = (page - 1) * limit;
    const query = {};

    if (status) {
      query.status = status;
    }

    const transactions = await PujaTransaction.find(query)
      .populate({
        path: 'userId',
        select: 'fullName phone',
        match: search ? { fullName: { $regex: search, $options: 'i' } } : {},
      })
      .populate('pujaId', 'title pujaImage')
      .sort({ created_at: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .lean();

    // Filter out null users when search doesn't match
    const filteredTransactions = transactions.filter(txn => txn.userId !== null);

    const total = await PujaTransaction.countDocuments(query);

    return res.status(200).json({
      success: true,
      message: 'Puja transactions fetched successfully',
      transactions: filteredTransactions,
      pagination: {
        totalItems: total,
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    next(error);
  }
};


module.exports = {
  createPuja,
  updatePuja,
  deletePuja,
  getAllPujas,
  getPujaById,
  updatePujaStatus,
  getAllPujaTransactions
};