const Admin = require("./admin");
const User = require("./user");
const Astrologer = require("./astrologer");
const Banner = require("./banner");
const Blog = require("./blog");
const Otp = require("./otp");
const BankAccountRequest = require("./bankAccountRequest");
const CallChatHistory = require("./callChatHistory");
const ChatMessage = require("./chatMessage");
const AdminCommissionHistory = require("./adminCommission");
const AstrologerWalletHistory = require("./astrologerWallet");
const UserWalletHistory = require("./userWallet");
const Rating = require("./rating");
const PendingTransaction = require("./userPendingTransaction");
const Language = require("./language");
const Skill = require("./skill");
const Category = require("./category");
const Product = require("./product");
const Puja = require("./puja");
const Chadawa = require("./chadawa");
const Notification = require("./notification");
const AstrologerSignupRequest = require("./astrologerSignupRequest");
const LiveStream = require("./liveStream");
const Gift = require("./gift");
const Cart = require("./cart");
const Address = require("./address");
const PujaTransaction = require("./pujaTransaction");
const ProductTransaction = require("./productTransaction");
const ChadawaTransaction = require("./chadawaTransaction");
const PujaReview = require("./pujaReview");
const ChadawaReview = require("./chadawaReview");
const ProductReview = require("./productReview");
const SentNotificationHistory = require("./sentNotificationHistory");
const { UserSetting, AstroSetting } = require("./siteSetting");

module.exports = {
  Admin,
  User,
  Astrologer,
  Banner,
  Blog,
  Otp,
  BankAccountRequest,
  CallChatHistory,
  ChatMessage,
  AdminCommissionHistory,
  AstrologerWalletHistory,
  UserWalletHistory,
  Rating,
  PendingTransaction,
  Language,
  Skill,
  Category,
  Product,
  Puja,
  Chadawa,
  AstrologerSignupRequest,
  LiveStream,
  Gift,
  UserSetting,
  AstroSetting,
  Cart,
  Address,
  PujaTransaction,
  ChadawaTransaction,
  ProductTransaction,
  PujaReview,
  ChadawaReview,
  ProductReview,
  Notification,
  SentNotificationHistory
};

