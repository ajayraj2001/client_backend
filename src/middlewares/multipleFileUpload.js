const multer = require('multer');
const fs = require('fs');
const { ApiError } = require('../errorHandler');

function getMultipleFilesUploader(fieldConfigs, mimetypes) {
  console.log('now in the get multi file uplozder code')
  if (!mimetypes) mimetypes = ['image/png', 'image/jpg', 'image/webp', 'image/jfif', 'application/octet-stream'];
console.log('her my son')
  // Create a storage engine that dynamically sets the destination folder
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      console.log("Destination function called for:", file.fieldname);
      // Get the destination folder for the current file field
      const fieldConfig = fieldConfigs.find((config) => config.name === file.fieldname);
      const destinationFolder = fieldConfig ? `public/${fieldConfig.folder}` : 'public/uploads';

      // Create the folder if it doesn't exist
      if (!fs.existsSync(destinationFolder)) {
        console.log("Creating folder:", destinationFolder);
        fs.mkdirSync(destinationFolder, { recursive: true });
      }
      console.log("Destination folder:", destinationFolder);
      cb(null, destinationFolder);
    },
    filename: function (req, file, cb) {
      console.log("Filename function called for:", file.fieldname);
      const { originalname } = file;
      let fileExt = '.jpeg';
      const extI = originalname.lastIndexOf('.');
      if (extI !== -1) {
        fileExt = originalname.substring(extI).toLowerCase();
      }
      const fileName = `${Date.now()}${fileExt}`;
      console.log("Generated filename:", fileName);
      cb(null, fileName);
    },
  });

  console.log("Now in getMultipleFilesUploader");
  // Create the Multer instance
  const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
      console.log("Filtering file:", file.originalname, file.mimetype);
      mimetypes.includes(file.mimetype) ? cb(null, true) : cb(new ApiError('Invalid image type', 400));
    },
    limits: {
      fileSize: 10 * 1024 * 1024, // 10 MB size limit
    },
  }).fields(fieldConfigs); // Use .fields() for multiple files

  console.log("getMultipleFilesUploader function is running");

  return upload;
}

module.exports = { getMultipleFilesUploader };