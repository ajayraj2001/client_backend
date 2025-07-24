const { PendingTransaction } = require('../../models');
const cron = require('node-cron');

const cleanupPendingTransactions = () => {
  // Run every day at midnight
  cron.schedule('0 0 * * *', async () => {
    try {
      const twentyFourHoursAgo = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
      await PendingTransaction.deleteMany({
        status: 'pending',
        timestamp: { $lt: twentyFourHoursAgo },
      });
      console.log('Cleaned up pending transactions');
    } catch (error) {
      console.error('Error cleaning up pending transactions:', error);
    }
  });
};

module.exports = {cleanupPendingTransactions};