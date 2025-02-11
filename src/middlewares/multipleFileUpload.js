// const multer = require('multer');
// const fs = require('fs').promises;
// const path = require('path');
// const { ApiError } = require('../errorHandler');

// const ALLOWED_MIME_TYPES = ['image/png', 'image/jpg', 'image/webp'];

// async function ensureDirectoryExists(directory) {
//   try {
//     await fs.mkdir(directory, { recursive: true });
//   } catch (err) {
//     console.error('Error creating directory:', err);
//     throw new ApiError('Server error while creating directory', 500);
//   }
// }

// function getMultipleFilesUploader(fieldConfigs) {
//   console.log('ANI IS BEWAKOOF')
//   const storage = multer.diskStorage({
//     destination: async function (req, file, cb) {
//       try {
//         const fieldConfig = fieldConfigs.find(config => config.name === file.fieldname);
//         const uploadDir = fieldConfig ? `public/${fieldConfig.folder}` : 'public/uploads';

//         await ensureDirectoryExists(uploadDir);
//         cb(null, uploadDir);
//       } catch (err) {
//         cb(err);
//       }
//     },
//     filename: function (req, file, cb) {
//       const fileExt = path.extname(file.originalname).toLowerCase() || '.jpg';
//       const fileName = `${Date.now()}${fileExt}`;
//       cb(null, fileName);
//     },
//   });

//   return multer({
//     storage,
//     fileFilter: (req, file, cb) => {
//       if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
//         return cb(new ApiError('Invalid file type BY aJAY rAJ', 400));
//       }
//       cb(null, true);
//     },
//     limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
//   }).fields(fieldConfigs);
// }


const multer = require('multer');
const fs = require('fs');
const { ApiError } = require('../errorHandler');

function getMultipleFilesUploader(fieldConfigs, mimetypes) {
  if (!mimetypes) mimetypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/jfif', 'application/octet-stream'];

  // Create a storage engine that dynamically sets the destination folder
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      // Get the destination folder for the current file field
      const fieldConfig = fieldConfigs.find((config) => config.name === file.fieldname);
      const destinationFolder = fieldConfig ? `public/${fieldConfig.folder}` : 'public/uploads';

      // Create the folder if it doesn't exist
      if (!fs.existsSync(destinationFolder)) {
        fs.mkdirSync(destinationFolder, { recursive: true });
      }

      cb(null, destinationFolder);
    },
    filename: function (req, file, cb) {
      const { originalname } = file;
      let fileExt = '.jpeg';
      const extI = originalname.lastIndexOf('.');
      if (extI !== -1) {
        fileExt = originalname.substring(extI).toLowerCase();
      }
      const fileName = `${Date.now()}${fileExt}`;
      cb(null, fileName);
    },
  });

  // Create the Multer instance
  const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
      mimetypes.includes(file.mimetype) ? cb(null, true) : cb(new ApiError('Invalid image type', 400));
    },
    limits: {
      fileSize: 10 * 1024 * 1024, // 10 MB size limit
    },
  }).fields(fieldConfigs); // Use .fields() for multiple files
  return upload;
}

module.exports = { getMultipleFilesUploader };
