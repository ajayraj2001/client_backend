const { User } = require('../models');
const { verifyAccessToken } = require('../utils');

const optionalAuthenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const legit = verifyAccessToken(token);
      const user = await User.findById(legit.id);

      if (user && user.status !== 'Inactive') {
        req.user = user;
        req.token = token;
      }
    }

    // Continue even if token not present or invalid
    next();
  } catch (err) {
    // Continue without throwing error
    next();
  }
};

module.exports = optionalAuthenticateUser;
