const bcrypt = require('bcrypt');
const { Admin } = require('../../models');
const { getCurrentIST } = require('../../utils/timeUtils');
const { ApiError } = require('../../errorHandler');
const { getFileUploader, deleteFile } = require('../../middlewares');

// Multer setup for profile image upload
const uploadProfileImage = getFileUploader('profile_image', 'admin_profiles');

// Add a Subadmin
const createSubAdmin = async (req, res, next) => {
    uploadProfileImage(req, res, async (err) => {
        if (err) {
            console.error('Multer Error:', err);
            return next(new ApiError(err.message, 400));
        }

        let profileImgPath = '';

        try {
            const { email, name, password, access_tabs, status } = req.body;

            // Check if email already exists
            const existingAdmin = await Admin.findOne({ email });
            if (existingAdmin) {
                return next(new ApiError('Email already exists', 400));
            }

            // Hash password before saving
            const hashedPassword = await bcrypt.hash(password, 10);

            if (req.file) {
                profileImgPath = `/admin_profiles/${req.file.filename}`;
            }

            const newSubadmin = new Admin({
                email,
                name,
                status,
                password: hashedPassword,
                profile_image: profileImgPath,
                role: 'subadmin',
                access_tabs: access_tabs ? JSON.parse(access_tabs) : [],
                created_at: getCurrentIST(),
                updated_at: getCurrentIST()
            });

            await newSubadmin.save();

            return res.status(201).json({
                success: true,
                message: 'Subadmin created successfully',
                data: newSubadmin,
            });
        } catch (error) {
            if (profileImgPath) {
                await deleteFile(profileImgPath);
            }
            next(error);
        }
    });
};

// Update a Subadmin
const updateSubAdmin = async (req, res, next) => {
    uploadProfileImage(req, res, async (err) => {
        if (err) {
            console.error('Multer Error:', err);
            return next(new ApiError(err.message, 400));
        }

        let profileImgPath = '';

        try {
            const { id } = req.params;
            const updates = req.body;
            updates.updated_at = getCurrentIST();

            // Check if email already exists and is not the current subadmin
            if (updates.email) {
                const existingAdmin = await Admin.findOne({ email: updates.email, _id: { $ne: id } });
                if (existingAdmin) {
                    return next(new ApiError('Email already exists', 400));
                }
            }

            const existingSubAdmin = await Admin.findById(id);
            if (!existingSubAdmin) {
                throw new ApiError('SubAdmin not found', 404);
            }

            if (updates.password) {
                updates.password = await bcrypt.hash(updates.password, 10);
            }

            if (req.file) {
                profileImgPath = `/admin_profiles/${req.file.filename}`;
                updates.profile_image = profileImgPath
            }

            if (updates.access_tabs) {
                updates.access_tabs = JSON.parse(updates.access_tabs);
            }

            const updatedSubadmin = await Admin.findByIdAndUpdate(id, updates, { new: true });
            if (!updatedSubadmin) throw new ApiError('Subadmin not found', 404);

            if (req.file && existingSubAdmin.profile_image) {
                await deleteFile(existingSubAdmin.profile_image);
            }

            return res.status(200).json({
                success: true,
                message: 'Subadmin updated successfully',
                data: updatedSubadmin,
            });
        } catch (error) {
            if (profileImgPath) {
                await deleteFile(profileImgPath);
            }
            next(error);
        }
    });
};

// Delete a Subadmin
const deleteSubAdmin = async (req, res, next) => {
    try {
        const { id } = req.params;

        const deletedSubadmin = await Admin.findByIdAndDelete(id);
        if (!deletedSubadmin) throw new ApiError('Subadmin not found', 404);

        // Delete profile image if exists
        if (deletedSubadmin.profile_image) {
            await deleteFile(deletedSubadmin.profile_image);
        }

        return res.status(200).json({
            success: true,
            message: 'Subadmin deleted successfully',
        });
    } catch (error) {
        next(error);
    }
};

// Get All Subadmins
const getSubAdmins = async (req, res, next) => {
    try {
        const subadmins = await Admin.find({ role: 'subadmin' });
        return res.status(200).json({
            success: true,
            message: 'Subadmins retrieved successfully',
            data: subadmins,
        });
    } catch (error) {
        next(error);
    }
};

const updateSubAdminStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Validate status
        if (!['Active', 'Inactive'].includes(status)) {
            throw new ApiError('Invalid status', 400);
        }

        // Find and update the astrologer status
        const subAdmin = await Admin.findByIdAndUpdate(id, { status }, { new: true });

        if (!subAdmin) {
            throw new ApiError('SubAdmin not found', 404);
        }

        return res.status(200).json({
            success: true,
            message: 'SubAdmin status updated successfully'
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createSubAdmin,
    updateSubAdmin,
    deleteSubAdmin,
    getSubAdmins,
    updateSubAdminStatus,
};