const Admin = require("./admin");
const User = require("./user");
const Astrologer = require("./astrologer");
const Banner = require("./banner");
const Blog = require("./blog");
const Otp = require("./otp");
const BankAccountRequest = require("./bankAccountRequest");
const CallChatHistory = require("./callChatHistory");
const AdminCommissionHistory = require("./adminCommission");
const AstrologerWalletHistory = require("./astrologerWallet");
const UserWalletHistory = require("./userWallet");
const Rating = require("./rating");
const PendingTransaction = require("./userPendingTransaction");

module.exports = {
  Admin,
  User,
  Astrologer,
  Banner,
  Blog,
  Otp,
  BankAccountRequest,
  CallChatHistory,
  AdminCommissionHistory,
  AstrologerWalletHistory,
  UserWalletHistory,
  Rating,
  PendingTransaction,
};

