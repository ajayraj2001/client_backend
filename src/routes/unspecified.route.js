const { ApiError } = require('../errorHandler');

const unspecifiedRoutesHandler = (req, res, next) => {
  next(new ApiError('Route Not Found', 404));
};

module.exports = unspecifiedRoutesHandler;
