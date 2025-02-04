const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');
const { ApiError } = require('../errorHandler');

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpg', 'image/webp'];

async function ensureDirectoryExists(directory) {
  try {
    await fs.mkdir(directory, { recursive: true });
  } catch (err) {
    console.error('Error creating directory:', err);
    throw new ApiError('Server error while creating directory', 500);
  }
}

function getMultipleFilesUploader(fieldConfigs) {
  const storage = multer.diskStorage({
    destination: async function (req, file, cb) {
      try {
        const fieldConfig = fieldConfigs.find(config => config.name === file.fieldname);
        const uploadDir = fieldConfig ? `public/${fieldConfig.folder}` : 'public/uploads';

        await ensureDirectoryExists(uploadDir);
        cb(null, uploadDir);
      } catch (err) {
        cb(err);
      }
    },
    filename: function (req, file, cb) {
      const fileExt = path.extname(file.originalname).toLowerCase() || '.jpg';
      const fileName = `${Date.now()}${fileExt}`;
      cb(null, fileName);
    },
  });

  return multer({
    storage,
    fileFilter: (req, file, cb) => {
      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return cb(new ApiError('Invalid file type', 400));
      }
      cb(null, true);
    },
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  }).fields(fieldConfigs);
}

module.exports = { getMultipleFilesUploader };
