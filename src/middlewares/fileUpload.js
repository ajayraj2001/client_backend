const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { ApiError } = require('../errorHandler')

function getFileUploader(fieldName, publicDirName = '', mimetypes) {
  if (!mimetypes) mimetypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/avif', 'image/jfif', 'application/octet-stream'];
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      if (!fs.existsSync(`public/${publicDirName}`)) {
        fs.mkdirSync(`public/${publicDirName}`, { recursive: true });
      }
      cb(null, `public/${publicDirName}`);
    },
    filename: function (req, file, cb) {
      const ext = path.extname(file.originalname).toLowerCase();
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
      const fileName = `${file.fieldname}-${uniqueSuffix}${ext}`;
      cb(null, fileName);
    }
  });
  const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
      mimetypes.includes(file.mimetype) ? cb(null, true) : cb(new ApiError('Invalid image type', 400));
    },
    limits: {
      fileSize: 10 * 1024 * 1024 // 5 MB size limit
    }
  }).single(fieldName);
  return upload;
}

module.exports = { getFileUploader };
