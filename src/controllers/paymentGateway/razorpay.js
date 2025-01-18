const Razorpay = require("razorpay");
const { RAZORPAY_KEY_ID = "1312312", RAZORPAY_KEY_SECRET= "hghjghj" } = process.env;

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

module.exports = razorpay;