const multer = require('multer');
const path = require('path');
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
      const ext = path.extname(file.originalname).toLowerCase();
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
      const fileName = `${file.fieldname}-${uniqueSuffix}${ext}`;
      console.log(`Generated filename for ${file.originalname}: ${fileName}`);
      cb(null, fileName);
    }
  });

  // filename: function (req, file, cb) {
  //   const { originalname } = file;
  //   let fileExt = '.jpeg';
  //   const extI = originalname.lastIndexOf('.');
  //   if (extI !== -1) {
  //     fileExt = originalname.substring(extI).toLowerCase();
  //   }
  //   const fileName = `${Date.now()}${fileExt}`;
  //   cb(null, fileName);
  // },

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
