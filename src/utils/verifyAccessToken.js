const jwt = require('jsonwebtoken');
const { ApiError } = require('../errorHandler');

const verifyAccessToken = (token) => {
  const secretKey = process.env.ACCESS_TOKEN_SECRET;
  if (!token) {
    throw new ApiError('Token Not Found', 401);
  }
  let decodedData = null;
  let error = null;
  jwt.verify(token, secretKey, (err, legit) => {
    if (err) {
      error = new ApiError('Access Token Invalid', 401);
      return;
    }
    decodedData = legit;
  });

  if (error) {
    throw error;
  }
  return decodedData;
};

module.exports = verifyAccessToken;
