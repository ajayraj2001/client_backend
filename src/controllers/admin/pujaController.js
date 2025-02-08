const { ApiError } = require('../../errorHandler');
const { Puja } = require('../../models');
const { getMultipleFilesUploader, deleteFile } = require('../../middlewares');

// Multer setup for puja image uploads
const uploadPujaFiles = getMultipleFilesUploader([
  { name: 'pujaImage', folder: 'puja_images', maxCount: 1 }, // Single puja image
  { name: 'bannerImages', folder: 'puja_banners', maxCount: 5 }, // Multiple banner images (max 5)
]);

// Create Puja
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
              slug,
              pujaDate,
              aboutPuja,
              benifits,
              faq,
              status,
              displayedPrice,
              actualPrice,
              isRecurring,
              compulsoryProducts,
              optionalProducts,
          } = req.body;

          // Save file paths if files are uploaded
          if (req.files?.pujaImage) {
              pujaImagePath = `/puja_images/${req.files.pujaImage[0].filename}`;
          }
          if (req.files?.bannerImages) {
              bannerImagePaths = req.files.bannerImages.map(file => `/puja_banners/${file.filename}`);
          }

          // Create new puja
          const puja = new Puja({
              title,
              slug,
              pujaDate,
              aboutPuja,
              displayedPrice,
              actualPrice,
              status,
              isRecurring,
              pujaImage: pujaImagePath,
              bannerImages: bannerImagePaths,
              benifits: benifits ? JSON.parse(benifits) : [],
              faq: faq ? JSON.parse(faq) : [],
              compulsoryProducts: compulsoryProducts ? JSON.parse(compulsoryProducts) : [],
              optionalProducts: optionalProducts ? JSON.parse(optionalProducts) : []
          });

          await puja.save();

          return res.status(201).json({
              success: true,
              message: 'Puja created successfully',
              data: puja,
          });

      } catch (error) {
          // Delete uploaded files if an error occurs
          if (pujaImagePath) await deleteFile(pujaImagePath);
          if (bannerImagePaths.length > 0) {
              await Promise.all(bannerImagePaths.map(path => deleteFile(path)));
          }
          next(error);
      }
  });
};

// Update Puja
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
              slug,
              pujaDate,
              aboutPuja,
              benifits,
              faq,
              status,
              displayedPrice,
              actualPrice,
              isRecurring,
              compulsoryProducts,
              optionalProducts,
          } = req.body;

          // Find the existing puja
          const existingPuja = await Puja.findById(id);
          if (!existingPuja) {
              throw new ApiError('Puja not found', 404);
          }

          // Save new file paths if files are uploaded
          if (req.files?.pujaImage) {
              pujaImagePath = `/puja_images/${req.files.pujaImage[0].filename}`;
          }
          if (req.files?.bannerImages) {
              bannerImagePaths = req.files.bannerImages.map(file => `/puja_banners/${file.filename}`);
          }

          // Update the puja
          const updateData = {
              title: title || existingPuja.title,
              slug: slug || existingPuja.slug,
              pujaDate: pujaDate || existingPuja.pujaDate,
              aboutPuja: aboutPuja || existingPuja.aboutPuja,
              displayedPrice: displayedPrice || existingPuja.displayedPrice,
              actualPrice: actualPrice || existingPuja.actualPrice,
              status: status || existingPuja.status,
              isRecurring: isRecurring ?? existingPuja.isRecurring,
              pujaImage: pujaImagePath || existingPuja.pujaImage,
              bannerImages: bannerImagePaths.length > 0 ? bannerImagePaths : existingPuja.bannerImages,
              benifits: benifits ? JSON.parse(benifits) : existingPuja.benifits,
              faq: faq ? JSON.parse(faq) : existingPuja.faq,
              compulsoryProducts: compulsoryProducts ? JSON.parse(compulsoryProducts) : existingPuja.compulsoryProducts,
              optionalProducts: optionalProducts ? JSON.parse(optionalProducts) : existingPuja.optionalProducts,
          };

          const puja = await Puja.findByIdAndUpdate(id, updateData, { new: true });

          if (!puja) {
              throw new ApiError('Error updating puja', 500);
          }

          // Delete old files if new ones are uploaded
          if (req.files?.pujaImage && existingPuja.pujaImage) {
              await deleteFile(existingPuja.pujaImage);
          }
          if (req.files?.bannerImages && existingPuja.bannerImages.length > 0) {
              await Promise.all(existingPuja.bannerImages.map(path => deleteFile(path)));
          }

          return res.status(200).json({
              success: true,
              message: 'Puja updated successfully',
              data: puja,
          });

      } catch (error) {
          // Delete uploaded files if an error occurs
          if (pujaImagePath) await deleteFile(pujaImagePath);
          if (bannerImagePaths.length > 0) {
              await Promise.all(bannerImagePaths.map(path => deleteFile(path)));
          }
          next(error);
      }
  });
};

// Delete Puja
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


module.exports = {
  createPuja,
  updatePuja,
  deletePuja,
  getAllPujas,
  getPujaById,
  updatePujaStatus,
};