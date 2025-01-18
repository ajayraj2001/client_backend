const mongoose = require('mongoose');
const fs = require('fs');
const util = require('util');

const getOtp = require('./getOtp');
const verifyAccessToken = require('./verifyAccessToken');


module.exports = {
  getOtp,
  verifyAccessToken,
};
