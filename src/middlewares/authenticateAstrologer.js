const { ApiError } = require('../errorHandler');
const { Astrologer } = require('../models');
const { verifyAccessToken } = require('../utils');

const authenticateAstrologer = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    const legit = verifyAccessToken(token);
    const astrologer = await Astrologer.findById(legit.id);
    if (astrologer) {
      req.astrologer = astrologer;
      req.token = token;
      return next();
    }
    throw new ApiError('Access forbidden', 403);
  } catch (err) {
    next(err);
  }
};

module.exports = authenticateAstrologer;
