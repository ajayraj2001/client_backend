const { ApiError } = require('../../errorHandler');
const { Puja } = require('../../models');
const slugify = require('slugify')
const { getMultipleFilesUploader, deleteFile } = require('../../middlewares');

// Multer setup for puja image uploads
const uploadPujaFiles = getMultipleFilesUploader([
  { name: 'pujaImage', folder: 'puja_images', maxCount: 1 }, // Single puja image
  { name: 'bannerImages', folder: 'puja_banners', maxCount: 6 }, // Multiple banner images (max 5)
  { name: 'offeringsImages', folder: 'puja_offerings', maxCount: 10 }
]);

// // Create Puja
// const createPuja = async (req, res, next) => {
//   uploadPujaFiles(req, res, async (err) => {
//     if (err) {
//       console.error('Multer Error:', err);
//       return next(new ApiError(err.message, 400));
//     }

//     let pujaImagePath = '';
//     let bannerImagePaths = [];

//     try {
//       const {
//         title,
//         slug,
//         aboutPuja,
//         shortDescription,
//         benifits,
//         faq,
//         status,
//         displayedPrice,
//         actualPrice,
//         compulsoryProducts,
//         optionalProducts,
//       } = req.body;

//       const finalSlug = slug || slugify(title, { lower: true, strict: true });

//       // Check for duplicate slug
//       const existing = await Puja.findOne({ slug: finalSlug });
//       if (existing) {
//         return next(new ApiError('Slug already exists, please choose another one', 400));
//       }

//       const isRecurring = req.body.isRecurring === 'true'; // Convert string to boolean

//       const pujaDate = isRecurring ? null : req.body.pujaDate;

//       // Save file paths if files are uploaded
//       if (req.files?.pujaImage) {
//         pujaImagePath = `/puja_images/${req.files.pujaImage[0].filename}`;
//       }
//       if (req.files?.bannerImages) {
//         bannerImagePaths = req.files.bannerImages.map(file => `/puja_banners/${file.filename}`);
//       }

//       // Create new puja
//       const puja = new Puja({
//         title,
//         slug: finalSlug,
//         pujaDate,
//         aboutPuja,
//         shortDescription,
//         displayedPrice,
//         actualPrice,
//         status,
//         isRecurring,
//         pujaImage: pujaImagePath,
//         bannerImages: bannerImagePaths,
//         benifits: benifits ? JSON.parse(benifits) : [],
//         faq: faq ? JSON.parse(faq) : [],
//         compulsoryProducts: compulsoryProducts ? JSON.parse(compulsoryProducts) : [],
//         optionalProducts: optionalProducts ? JSON.parse(optionalProducts) : []
//       });

//       await puja.save();

//       const populatedPuja = await Puja.findById(id)
//         .populate('compulsoryProducts', 'name')
//         .populate('optionalProducts', 'name');


//       return res.status(201).json({
//         success: true,
//         message: 'Puja created successfully',
//         data: populatedPuja,
//       });

//     } catch (error) {
//       // Delete uploaded files if an error occurs
//       if (pujaImagePath) await deleteFile(pujaImagePath);
//       if (bannerImagePaths.length > 0) {
//         await Promise.all(bannerImagePaths.map(path => deleteFile(path)));
//       }
//       next(error);
//     }
//   });
// };

// // Update Puja
// const updatePuja = async (req, res, next) => {
//   uploadPujaFiles(req, res, async (err) => {
//     if (err) {
//       console.error('Multer Error:', err);
//       return next(new ApiError(err.message, 400));
//     }

//     let pujaImagePath = '';
//     let bannerImagePaths = [];

//     try {
//       const { id } = req.params;
//       const {
//         title,
//         slug,
//         aboutPuja,
//         shortDescription,
//         benifits,
//         faq,
//         status,
//         displayedPrice,
//         actualPrice,
//         compulsoryProducts,
//         optionalProducts,
//       } = req.body;

//       // Find the existing puja
//       const existingPuja = await Puja.findById(id);
//       if (!existingPuja) {
//         throw new ApiError('Puja not found', 404);
//       }

//       let finalSlug = slug || existingPuja.slug;

//       if (slug && slug !== existingPuja.slug) {
//         finalSlug = slugify(slug, { lower: true, strict: true });
//         const duplicate = await Puja.findOne({ slug: finalSlug, _id: { $ne: id } });
//         if (duplicate) {
//           return next(new ApiError('Slug already exists, choose a unique one', 400));
//         }
//       }

//       // Convert `isRecurring` to a boolean
//       const isRecurring = req.body.isRecurring === 'true';


//       // Set `pujaDate` based on `isRecurring`
//       const pujaDate = isRecurring ? null : req.body.pujaDate || existingPuja.pujaDate;

//       // Save new file paths if files are uploaded
//       if (req.files?.pujaImage) {
//         pujaImagePath = `/puja_images/${req.files.pujaImage[0].filename}`;
//       }
//       if (req.files?.bannerImages) {
//         bannerImagePaths = req.files.bannerImages.map(file => `/puja_banners/${file.filename}`);
//       }

//       // Update the puja
//       const updateData = {
//         title: title || existingPuja.title,
//         slug: finalSlug,
//         pujaDate,
//         aboutPuja: aboutPuja || existingPuja.aboutPuja,
//         shortDescription: shortDescription || existingPuja.shortDescription,
//         displayedPrice: displayedPrice || existingPuja.displayedPrice,
//         actualPrice: actualPrice || existingPuja.actualPrice,
//         status: status || existingPuja.status,
//         isRecurring,
//         pujaImage: pujaImagePath || existingPuja.pujaImage,
//         bannerImages: bannerImagePaths.length > 0 ? bannerImagePaths : existingPuja.bannerImages,
//         benifits: benifits ? JSON.parse(benifits) : existingPuja.benifits,
//         faq: faq ? JSON.parse(faq) : existingPuja.faq,
//         compulsoryProducts: compulsoryProducts ? JSON.parse(compulsoryProducts) : existingPuja.compulsoryProducts,
//         optionalProducts: optionalProducts ? JSON.parse(optionalProducts) : existingPuja.optionalProducts,
//       };

//       const puja = await Puja.findByIdAndUpdate(
//         id,
//         updateData,
//         { new: true }
//       ).populate('compulsoryProducts', 'name')
//         .populate('optionalProducts', 'name');

//       if (!puja) {
//         throw new ApiError('Error updating puja', 500);
//       }

//       // Delete old files if new ones are uploaded
//       if (req.files?.pujaImage && existingPuja.pujaImage) {
//         await deleteFile(existingPuja.pujaImage);
//       }
//       if (req.files?.bannerImages && existingPuja.bannerImages.length > 0) {
//         await Promise.all(existingPuja.bannerImages.map(path => deleteFile(path)));
//       }

//       return res.status(200).json({
//         success: true,
//         message: 'Puja updated successfully',
//         data: puja,
//       });

//     } catch (error) {
//       // Delete uploaded files if an error occurs
//       if (pujaImagePath) await deleteFile(pujaImagePath);
//       if (bannerImagePaths.length > 0) {
//         await Promise.all(bannerImagePaths.map(path => deleteFile(path)));
//       }
//       next(error);
//     }
//   });
// };

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
        benifits,
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
        benefits: benifits ? JSON.parse(benifits) : [],
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
      if (pujaImagePath) await deleteFile(pujaImagePath);
      if (bannerImagePaths.length > 0) {
        await Promise.all(bannerImagePaths.map(path => deleteFile(path)));
      }
      next(error);
    }
  });
};


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
        benifits,
        pujaProcess,
        faq,
        packages,
        status,
        displayedPrice,
        actualPrice,
        // isRecurring,
        pujaDate
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

      // isPopular fallback logic
      const isPopular = req.body.hasOwnProperty('isPopular')
        ? req.body.isPopular === 'true'
        : existingPuja.isPopular;

      // const parsedBoolean = isRecurring === 'true';
      // const finalDate = parsedBoolean ? null : pujaDate || existingPuja.pujaDate;

      if (req.files?.pujaImage) {
        pujaImagePath = `/puja_images/${req.files.pujaImage[0].filename}`;
      }
      if (req.files?.bannerImages) {
        bannerImagePaths = req.files.bannerImages.map(file => `/puja_banners/${file.filename}`);
      }


      let updatedOfferings = req.body.offerings ? JSON.parse(req.body.offerings) : [];

      const oldOfferings = existingPuja.offerings || [];
      const offeringImages = req.files?.offeringsImages || [];

      // Loop through updated offerings
      updatedOfferings = await Promise.all(
        updatedOfferings.map(async (offering, index) => {
          const oldOffering = oldOfferings[index];
          const newImageFile = offeringImages[index];

          // If a new image is uploaded
          if (newImageFile) {
            // Delete the old image if it exists
            if (oldOffering && oldOffering.image) {
              await deleteFile(oldOffering.image);
            }
            offering.image = `/puja_offerings/${newImageFile.filename}`;
          } else {
            // If no new image, retain old image if exists
            offering.image = oldOffering?.image || '';
          }

          return offering;
        })
      );


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
        // isRecurring: parsedBoolean,
        isPopular,
        pujaImage: pujaImagePath || existingPuja.pujaImage,
        bannerImages: bannerImagePaths.length > 0 ? bannerImagePaths : existingPuja.bannerImages,
        benefits: benifits ? JSON.parse(benifits) : existingPuja.benefits,
        pujaProcess: pujaProcess ? JSON.parse(pujaProcess) : existingPuja.pujaProcess,
        faq: faq ? JSON.parse(faq) : existingPuja.faq,
        packages: packages ? JSON.parse(packages) : existingPuja.packages,
        offerings: updatedOfferings,
      };

      const updatedPuja = await Puja.findByIdAndUpdate(id, updateData, { new: true })

      if (!updatedPuja) throw new ApiError('Error updating puja', 500);

      if (req.files?.pujaImage && existingPuja.pujaImage) {
        await deleteFile(existingPuja.pujaImage);
      }
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