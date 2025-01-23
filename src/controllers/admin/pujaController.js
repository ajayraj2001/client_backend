const { Puja } = require('../../models');
const { ApiError } = require('../../errorHandler');
const { getMultipleFilesUploader, deleteFile } = require('../../middlewares');

// Multer setup for multiple file uploads
const uploadPujaFiles = getMultipleFilesUploader([
    { name: 'pujaImage', folder: 'puja_images' }, // Save puja images in 'puja_images' folder
    { name: 'bannerImages', folder: 'puja_banners', maxCount: 5 }, // Save banner images in 'puja_banners' folder (max 5 images)
]);

// Create a new puja
const createPuja = async (req, res, next) => {
    let pujaImagePath = '';
    let bannerImagePaths = [];

    try {
        // Handle multiple file uploads
        uploadPujaFiles(req, res, async (err) => {
            if (err) {
                console.error('Multer Error:', err); // Log Multer errors
                return next(new ApiError(err.message, 400));
            }

            const {
                title,
                slug,
                pujaDate,
                aboutPuja,
                benifits,
                packages,
                faq,
                isRecurring,
            } = req.body;

            // Check if slug already exists (if provided)
            if (slug) {
                const existingPuja = await Puja.findOne({ slug });
                if (existingPuja) {
                    throw new ApiError('Puja with this slug already exists', 400);
                }
            }

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
                slug: slug || '', // Use provided slug or leave empty
                pujaImage: pujaImagePath || '', // Save file path or empty string
                bannerImages: bannerImagePaths, // Save banner image paths
                pujaDate: isRecurring ? null : pujaDate, // Set pujaDate to null for recurring pujas
                aboutPuja,
                benifits,
                packages,
                faq,
                isRecurring,
            });

            await puja.save();

            return res.status(201).json({
                success: true,
                message: 'Puja created successfully',
                data: puja,
            });
        });
    } catch (error) {
        // Delete uploaded files if an error occurs
        if (pujaImagePath) await deleteFile(pujaImagePath);
        if (bannerImagePaths.length > 0) {
            await Promise.all(bannerImagePaths.map(path => deleteFile(path)));
        }

        next(error);
    }
};

// Update a puja
const updatePuja = async (req, res, next) => {
    let pujaImagePath = '';
    let bannerImagePaths = [];

    try {
        // Handle multiple file uploads
        uploadPujaFiles(req, res, async (err) => {
            if (err) {
                console.error('Multer Error:', err); // Log Multer errors
                return next(new ApiError(err.message, 400));
            }

            const { id } = req.params;
            const {
                title,
                slug,
                pujaDate,
                aboutPuja,
                benifits,
                packages,
                faq,
                isRecurring,
            } = req.body;

            // Check if slug already exists (if provided and changed)
            if (slug) {
                const existingPuja = await Puja.findOne({ slug, _id: { $ne: id } });
                if (existingPuja) {
                    throw new ApiError('Puja with this slug already exists', 400);
                }
            }

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
                title,
                slug: slug || existingPuja.slug, // Use provided slug or keep existing
                pujaImage: pujaImagePath || existingPuja.pujaImage, // Use new file path or keep existing
                bannerImages: bannerImagePaths.length > 0 ? bannerImagePaths : existingPuja.bannerImages, // Use new file paths or keep existing
                pujaDate: isRecurring ? null : pujaDate, // Set pujaDate to null for recurring pujas
                aboutPuja,
                benifits,
                packages,
                faq,
                isRecurring,
            };

            const puja = await Puja.findByIdAndUpdate(id, updateData, { new: true });

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
        });
    } catch (error) {
        // Delete uploaded files if an error occurs
        if (pujaImagePath) await deleteFile(pujaImagePath);
        if (bannerImagePaths.length > 0) {
            await Promise.all(bannerImagePaths.map(path => deleteFile(path)));
        }

        next(error);
    }
};

// Get all pujas with search and sorting
const getAllPujas = async (req, res, next) => {
    try {
        const { search, status } = req.query;

        // Build the search query
        const searchQuery = {
            $or: [
                { title: { $regex: search || '', $options: 'i' } }, // Case-insensitive search by title
                // { slug: { $regex: search || '', $options: 'i' } }, // Case-insensitive search by slug
            ],
        };

        // Add status filter if provided
        if (status) {
            searchQuery.status = status;
        }

        // Fetch pujas with search and sorting
        const pujas = await Puja.find(searchQuery)
            .sort({ created_at: -1 }); // Newest pujas at the top

        return res.status(200).json({
            success: true,
            message: 'Pujas fetched successfully',
            data: pujas,
        });
    } catch (error) {
        next(error);
    }
};

// Get a specific puja by ID
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

// Delete a puja
const deletePuja = async (req, res, next) => {
    try {
        const { id } = req.params;

        const puja = await Puja.findByIdAndDelete(id);
        if (!puja) {
            throw new ApiError('Puja not found', 404);
        }

        return res.status(200).json({
            success: true,
            message: 'Puja deleted successfully',
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
};
