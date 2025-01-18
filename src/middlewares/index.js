const authenticateAdmin = require('./authenticateAdmin');
const authenticateUser = require('./authenticateUser');
const authenticateAstrologer = require('./authenticateAstrologer');
const {getFileUploader} = require('./fileUpload');
const {getMultipleFilesUploader} = require('./multipleFileUpload');
const {deleteFile} = require('./deleteFile');
module.exports = {
  authenticateUser,
  authenticateAdmin,
  authenticateAstrologer,
  getFileUploader,
  getMultipleFilesUploader,
  deleteFile
};
