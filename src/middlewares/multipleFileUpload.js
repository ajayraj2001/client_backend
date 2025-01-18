// const multer = require('multer');
// const fs = require('fs');
// const { ApiError } = require("../errorHandler");


// function getMultipleFilesUploader(fieldNames, publicDirName = '', mimetypes) {
//   if (!mimetypes) mimetypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

//   const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//       if (!fs.existsSync(`public/${publicDirName}`)) {
//         fs.mkdirSync(`public/${publicDirName}`, { recursive: true });
//       }
//       cb(null, `public/${publicDirName}`);
//     },
//     filename: function (req, file, cb) {
//       const { originalname } = file;
//       let fileExt = '.jpeg';
//       const extI = originalname.lastIndexOf('.');
//       if (extI !== -1) {
//         fileExt = originalname.substring(extI).toLowerCase();
//       }
//       const fileName = `${Date.now()}${fileExt}`;
//       cb(null, fileName);
//     },
//   });

//   const fieldsArray = fieldNames.map(name => ({ name }));

//   const upload = multer({
//     storage: storage,
//     fileFilter: (req, file, cb) => {
//       mimetypes.includes(file.mimetype) ? cb(null, true) : cb(new ApiError('Invalid image type', 400));
//     },
//     limits: {
//       fileSize: 10 * 1024 * 1024 // 5 MB size limit
//     }
//   }).fields(fieldsArray);

//   return upload;
// }

// module.exports = {getMultipleFilesUploader};



const multer = require('multer');
const fs = require('fs');
const { ApiError } = require('../errorHandler');

function getMultipleFilesUploader(fieldConfigs, mimetypes) {
  if (!mimetypes) mimetypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

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