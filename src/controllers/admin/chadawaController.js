const { ApiError } = require('../../errorHandler');
const { Chadawa, ChadawaTransaction } = require('../../models');
const slugify = require('slugify')
const { getMultipleFilesUploader, deleteFile } = require('../../middlewares');

// Multer setup for chadawa image uploads
const uploadChadawaFiles = getMultipleFilesUploader([
  { name: 'chadawaImage', folder: 'chadawa_images', maxCount: 1 }, // Single chadawa image
  { name: 'bannerImages', folder: 'chadawa_banners', maxCount: 6 }, // Multiple banner images (max 6)
  { name: 'offeringImage', folder: 'chadawa_offering', maxCount: 1 } // Single offering image
]);

const createChadawa = async (req, res, next) => {
  uploadChadawaFiles(req, res, async (err) => {
    if (err) {
      console.error('Multer Error:', err);
      return next(new ApiError(err.message, 400));
    }

    let chadawaImagePath = '';
    let bannerImagePaths = [];
    let offeringImagePath = '';

    try {
      const {
        title,
        titleHindi,
        slug,
        aboutChadawa,
        aboutChadawaHindi,
        shortDescription,
        shortDescriptionHindi,
        location,
        locationHindi,
        benefits,
        faq,
        status,
        displayedPrice,
        actualPrice,
        chadawaDate,
        offering
      } = req.body;

      const finalSlug = slug || slugify(title, { lower: true, strict: true });

      const existing = await Chadawa.findOne({ slug: finalSlug });
      if (existing) {
        return next(new ApiError('Slug already exists, please choose another one', 400));
      }

      const isPopular = req.body.isPopular === 'true';

      if (req.files?.chadawaImage) {
        chadawaImagePath = `/chadawa_images/${req.files.chadawaImage[0].filename}`;
      }
      if (req.files?.bannerImages) {
        bannerImagePaths = req.files.bannerImages.map(file => `/chadawa_banners/${file.filename}`);
      }
      if (req.files?.offeringImage) {
        offeringImagePath = `/chadawa_offering/${req.files.offeringImage[0].filename}`;
      }

      // Parse offering and add image if present
      let parsedOffering = offering ? JSON.parse(offering) : {};
      if (offeringImagePath) {
        parsedOffering.image = offeringImagePath;
      }

      const chadawa = new Chadawa({
        title,
        titleHindi,
        slug: finalSlug,
        chadawaDate,
        aboutChadawa,
        aboutChadawaHindi,
        shortDescription,
        shortDescriptionHindi,
        location,
        locationHindi,
        displayedPrice,
        actualPrice,
        status,
        isPopular,
        chadawaImage: chadawaImagePath,
        bannerImages: bannerImagePaths,
        benefits: benefits ? JSON.parse(benefits) : [],
        faq: faq ? JSON.parse(faq) : [],
        offering: parsedOffering,
      });

      await chadawa.save();

      const populatedChadawa = await Chadawa.findById(chadawa._id);

      return res.status(201).json({
        success: true,
        message: 'Chadawa created successfully',
        data: populatedChadawa,
      });

    } catch (error) {
      console.log('error', error);
      if (chadawaImagePath) await deleteFile(chadawaImagePath);
      if (bannerImagePaths.length > 0) {
        await Promise.all(bannerImagePaths.map(path => deleteFile(path)));
      }
      if (offeringImagePath) await deleteFile(offeringImagePath);
      next(error);
    }
  });
};

const updateChadawa = async (req, res, next) => {
  uploadChadawaFiles(req, res, async (err) => {
    if (err) {
      console.error('Multer Error:', err);
      return next(new ApiError(err.message, 400));
    }

    let chadawaImagePath = '';
    let bannerImagePaths = [];
    let offeringImagePath = '';

    try {
      const { id } = req.params;

      const {
        title,
        titleHindi,
        slug,
        aboutChadawa,
        aboutChadawaHindi,
        shortDescription,
        shortDescriptionHindi,
        location,
        locationHindi,
        benefits,
        faq,
        status,
        displayedPrice,
        actualPrice,
        chadawaDate,
        offering,
      } = req.body;

      const existingChadawa = await Chadawa.findById(id);
      if (!existingChadawa) throw new ApiError('Chadawa not found', 404);

      let finalSlug = slug || existingChadawa.slug;
      if (slug && slug !== existingChadawa.slug) {
        finalSlug = slugify(slug, { lower: true, strict: true });
        const duplicate = await Chadawa.findOne({ slug: finalSlug, _id: { $ne: id } });
        if (duplicate) {
          return next(new ApiError('Slug already exists, choose a unique one', 400));
        }
      }

      if (req.files?.chadawaImage) {
        chadawaImagePath = `/chadawa_images/${req.files.chadawaImage[0].filename}`;
      }
      if (req.files?.bannerImages) {
        bannerImagePaths = req.files.bannerImages.map(file => `/chadawa_banners/${file.filename}`);
      }
      if (req.files?.offeringImage) {
        offeringImagePath = `/chadawa_offering/${req.files.offeringImage[0].filename}`;
      }

      // Handle offering update
      let finalOffering = existingChadawa.offering || {};
      if (offering) {
        const parsedOffering = JSON.parse(offering);
        finalOffering = { ...finalOffering, ...parsedOffering };
      }
      
      // Update offering image if new one is provided
      if (offeringImagePath) {
        // Delete old offering image if it exists
        if (existingChadawa.offering?.image) {
          await deleteFile(existingChadawa.offering.image);
        }
        finalOffering.image = offeringImagePath;
      }

      // Build Final Update Data
      const updateData = {
        title: title || existingChadawa.title,
        titleHindi: titleHindi || existingChadawa.titleHindi,
        slug: finalSlug,
        chadawaDate: chadawaDate || existingChadawa.chadawaDate,
        aboutChadawa: aboutChadawa || existingChadawa.aboutChadawa,
        aboutChadawaHindi: aboutChadawaHindi || existingChadawa.aboutChadawaHindi,
        shortDescription: shortDescription || existingChadawa.shortDescription,
        shortDescriptionHindi: shortDescriptionHindi || existingChadawa.shortDescriptionHindi,
        location: location || existingChadawa.location,
        locationHindi: locationHindi || existingChadawa.locationHindi,
        displayedPrice: displayedPrice || existingChadawa.displayedPrice,
        actualPrice: actualPrice || existingChadawa.actualPrice,
        status: status || existingChadawa.status,
        isPopular: 'isPopular' in req.body ? req.body.isPopular === 'true' : existingChadawa.isPopular,
        chadawaImage: chadawaImagePath || existingChadawa.chadawaImage,
        bannerImages: bannerImagePaths.length > 0 ? bannerImagePaths : existingChadawa.bannerImages,
        benefits: benefits ? JSON.parse(benefits) : existingChadawa.benefits,
        faq: faq ? JSON.parse(faq) : existingChadawa.faq,
        offering: finalOffering,
      };

      const updatedChadawa = await Chadawa.findByIdAndUpdate(id, updateData, { new: true });
      if (!updatedChadawa) throw new ApiError('Error updating chadawa', 500);

      // Delete old chadawa image if replaced
      if (req.files?.chadawaImage && existingChadawa.chadawaImage) {
        await deleteFile(existingChadawa.chadawaImage);
      }

      // Delete old banner images if replaced
      if (req.files?.bannerImages && existingChadawa.bannerImages.length > 0) {
        await Promise.all(existingChadawa.bannerImages.map(path => deleteFile(path)));
      }

      return res.status(200).json({
        success: true,
        message: 'Chadawa updated successfully',
        data: updatedChadawa,
      });

    } catch (error) {
      if (chadawaImagePath) await deleteFile(chadawaImagePath);
      if (bannerImagePaths.length > 0) {
        await Promise.all(bannerImagePaths.map(path => deleteFile(path)));
      }
      if (offeringImagePath) await deleteFile(offeringImagePath);
      next(error);
    }
  });
};

const deleteChadawa = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find and delete the chadawa
    const chadawa = await Chadawa.findByIdAndDelete(id);
    if (!chadawa) {
      throw new ApiError('Chadawa not found', 404);
    }

    // Delete associated files
    if (chadawa.chadawaImage) {
      await deleteFile(chadawa.chadawaImage);
    }
    if (chadawa.bannerImages.length > 0) {
      await Promise.all(chadawa.bannerImages.map(path => deleteFile(path)));
    }
    if (chadawa.offering?.image) {
      await deleteFile(chadawa.offering.image);
    }

    return res.status(200).json({
      success: true,
      message: 'Chadawa deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Get All Chadawas
const getAllChadawas = async (req, res, next) => {
  try {
    const chadawas = await Chadawa.find({})
      .sort({ _id: -1 });

    return res.status(200).json({
      success: true,
      message: 'Chadawas fetched successfully',
      data: chadawas,
    });
  } catch (error) {
    next(error);
  }
};

// Get Chadawa by ID
const getChadawaById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const chadawa = await Chadawa.findById(id);
    if (!chadawa) {
      throw new ApiError('Chadawa not found', 404);
    }

    return res.status(200).json({
      success: true,
      message: 'Chadawa fetched successfully',
      data: chadawa,
    });
  } catch (error) {
    next(error);
  }
};

const updateChadawaStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    if (!['Active', 'Inactive'].includes(status)) {
      throw new ApiError('Invalid status', 400);
    }

    // Find and update the chadawa status
    const chadawa = await Chadawa.findByIdAndUpdate(id, { status }, { new: true });

    if (!chadawa) {
      throw new ApiError('Chadawa not found', 404);
    }

    return res.status(200).json({
      success: true,
      message: 'Chadawa status updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

const getAllChadawaTransactions = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = '', status } = req.query;

    const skip = (page - 1) * limit;
    const query = {};

    if (status) {
      query.status = status;
    }

    const transactions = await ChadawaTransaction.find(query)
      .populate({
        path: 'userId',
        select: 'fullName phone',
        match: search ? { fullName: { $regex: search, $options: 'i' } } : {},
      })
      .populate('chadawaId', 'title chadawaImage')
      .sort({ created_at: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .lean();

    // Filter out null users when search doesn't match
    const filteredTransactions = transactions.filter(txn => txn.userId !== null);

    const total = await ChadawaTransaction.countDocuments(query);

    return res.status(200).json({
      success: true,
      message: 'Chadawa transactions fetched successfully',
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
  createChadawa,
  updateChadawa,
  deleteChadawa,
  getAllChadawas,
  getChadawaById,
  updateChadawaStatus,
  getAllChadawaTransactions
};