const getOtp = () => {
  const max = 999999;
  return String((Math.random() * max) | 0).padStart(6, '0');
};

module.exports = getOtp;
