// utils/timeUtils.js

// Function to get current time in IST
const getCurrentIST = () => {
    const date = new Date();
    const offset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    return new Date(date.getTime() + offset);
};

module.exports = { getCurrentIST };