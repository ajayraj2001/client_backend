const { ApiError } = require('../../errorHandler');
const { User, Astrologer, CallChatHistory, UserWalletHistory } = require('../../models');

const getTodayMetrics = async (req, res) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
  
      const todayUsers = await User.countDocuments({ created_at: { $gte: today } });
      const todayAstrologers = await Astrologer.countDocuments({ created_at: { $gte: today } });
      const todayCalls = await CallChatHistory.aggregate([
        { $match: { created_at: { $gte: today } } },
        { $group: { _id: '$call_type', count: { $sum: 1 } } }
      ]);
      const todayRevenue = await UserWalletHistory.aggregate([
        { $match: { timestamp: { $gte: today }, status: 'success', transaction_type: 'credit' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
  
      res.status(200).json({
        success: true,
        data: {
          today_users: todayUsers,
          today_astrologers: todayAstrologers,
          today_calls: {
            chat: todayCalls.find(c => c._id === 'chat')?.count || 0,
            voice: todayCalls.find(c => c._id === 'voice')?.count || 0,
            video: todayCalls.find(c => c._id === 'video')?.count || 0
          },
          today_revenue: todayRevenue[0]?.total || 0
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  const getRealTimeMetrics = async (req, res) => {
    try {
      const ongoingCalls = await CallChatHistory.countDocuments({ status: 'accept_astro' });
      const activeUsers = await User.countDocuments({ status: 'Active' });
      const activeAstrologers = await Astrologer.countDocuments({ status: 'Active' });
  
      res.status(200).json({
        success: true,
        data: {
          ongoing_calls: ongoingCalls,
          active_users: activeUsers,
          active_astrologers: activeAstrologers
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  const getTrends = async (req, res) => {
    try {
      const now = new Date();
      const last7Days = new Date(now.setDate(now.getDate() - 7));
      const last30Days = new Date(now.setDate(now.getDate() - 30));
      const last90Days = new Date(now.setDate(now.getDate() - 90));
  
      const revenueTrends = await UserWalletHistory.aggregate([
        {
          $match: {
            timestamp: { $gte: last90Days },
            status: 'success',
            transaction_type: 'credit'
          }
        },
        {
          $group: {
            _id: {
              $cond: [
                { $gte: ['$timestamp', last7Days] },
                'last_7_days',
                { $cond: [{ $gte: ['$timestamp', last30Days] }, 'last_30_days', 'last_90_days'] }
              ]
            },
            total: { $sum: '$amount' }
          }
        }
      ]);
  
      const callTrends = await CallChatHistory.aggregate([
        {
          $match: { created_at: { $gte: last90Days } }
        },
        {
          $group: {
            _id: {
              $cond: [
                { $gte: ['$created_at', last7Days] },
                'last_7_days',
                { $cond: [{ $gte: ['$created_at', last30Days] }, 'last_30_days', 'last_90_days'] }
              ]
            },
            count: { $sum: 1 }
          }
        }
      ]);
  
      res.status(200).json({
        success: true,
        data: {
          revenue_trends: {
            last_7_days: revenueTrends.find(r => r._id === 'last_7_days')?.total || 0,
            last_30_days: revenueTrends.find(r => r._id === 'last_30_days')?.total || 0,
            last_90_days: revenueTrends.find(r => r._id === 'last_90_days')?.total || 0
          },
          call_trends: {
            last_7_days: callTrends.find(c => c._id === 'last_7_days')?.count || 0,
            last_30_days: callTrends.find(c => c._id === 'last_30_days')?.count || 0,
            last_90_days: callTrends.find(c => c._id === 'last_90_days')?.count || 0
          }
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  const getNotifications = async (req, res) => {
    try {
      const failedTransactions = await UserWalletHistory.countDocuments({ status: 'failed' });
      const lowRatedAstrologers = await Astrologer.find({ rating: { $lt: 3 } }).limit(10);
      const usersWithIncompleteProfiles = await User.countDocuments({ is_profile_complete: false });
  
      res.status(200).json({
        success: true,
        data: {
          failed_transactions: failedTransactions,
          low_rated_astrologers: lowRatedAstrologers.map(a => ({ name: a.name, rating: a.rating })),
          users_with_incomplete_profiles: usersWithIncompleteProfiles
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  module.exports = {
    getTodayMetrics,
    getRealTimeMetrics,
    getTrends,
    getNotifications
  }