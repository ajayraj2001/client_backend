const { ApiError } = require('../../errorHandler');
const mongoose = require('mongoose');
const { getCurrentIST } = require('../../utils/timeUtils');
const { User, Astrologer, CallChatHistory, UserWalletHistory, AstrologerWalletHistory, AdminCommissionHistory, ProductTransaction, 
  PujaTransaction, Product } = require('../../models');

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



//for users and revenue chart 
/**
 * Get admin revenue dashboard data
 * Provides revenue data for different services (calls, products, pujas) 
 * across various time periods
 */
const getAdminRevenueDashboard = async (req, res, next) => {
  try {
    // Get query parameters with defaults
    const { type = 'overall', period = '7d' } = req.query;

    // Validate input
    const validTypes = ['overall', 'call', 'product', 'puja'];
    if (!validTypes.includes(type)) {
      throw new ApiError('Invalid type parameter. Allowed values: overall, call, product, puja', 400);
    }

    const validPeriods = ['7d', '30d', '12m', 'this_week', 'this_month', 'ytd'];
    if (!validPeriods.includes(period)) {
      throw new ApiError('Invalid period parameter', 400);
    }

    // Calculate date range based on period
    const { startDate, endDate, dateFormat, groupByField, includeUpcoming } = getDateRangeConfig(period);

    // Get chart data and totals based on type
    let chartData, totals, breakdownByType;

    if (type === 'overall') {
      // Get combined revenue for all service types
      const results = await Promise.all([
        getRevenueData('call', startDate, endDate, dateFormat, groupByField, includeUpcoming, period),
        getRevenueData('product', startDate, endDate, dateFormat, groupByField, includeUpcoming, period),
        getRevenueData('puja', startDate, endDate, dateFormat, groupByField, includeUpcoming, period)
      ]);

      const [callData, productData, pujaData] = results;
      
      // Combine the data by date
      chartData = combineChartData(callData.chartData, productData.chartData, pujaData.chartData, dateFormat);
      
      // Calculate combined totals
      totals = {
        total: callData.totals.total + productData.totals.total + pujaData.totals.total,
        call: callData.totals.total,
        product: productData.totals.total,
        puja: pujaData.totals.total
      };

    } else {
      // Get revenue for specific service type
      const result = await getRevenueData(type, startDate, endDate, dateFormat, groupByField, includeUpcoming, period);
      chartData = result.chartData;
      totals = result.totals;
      breakdownByType = result.breakdownByType;
    }

    // Build response
    const response = {
      success: true,
      message: "Admin Revenue Dashboard Data",
      data: {
        period,
        type,
        totals,
        chart: chartData
      }
    };

    // Add breakdown by type if available (for specific service types)
    if (breakdownByType) {
      response.data.breakdown_by_type = breakdownByType;
    }

    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get admin user growth dashboard data
 * Tracks user registrations over time
 */
const getAdminUserDashboard = async (req, res, next) => {
  try {
    const { period = '7d' } = req.query;

    // Validate input
    const validPeriods = ['7d', '30d', '12m', 'this_week', 'this_month', 'ytd'];
    if (!validPeriods.includes(period)) {
      throw new ApiError('Invalid period parameter', 400);
    }

    // Calculate date range based on period
    const { startDate, endDate, dateFormat, groupByField, includeUpcoming } = getDateRangeConfig(period);

    // Get user registration data
    const chartData = await getUserRegistrationData(startDate, endDate, dateFormat, groupByField, includeUpcoming, period);
    
    // Get total users count
    const totalUsers = await User.countDocuments();
    
    // Count users registered in the selected period
    const usersInPeriod = await User.countDocuments({
      created_at: { $gte: startDate, $lte: endDate }
    });

    // Build response
    const response = {
      success: true,
      message: "Admin User Dashboard Data",
      data: {
        period,
        totals: {
          total_users: totalUsers,
          new_users_in_period: usersInPeriod
        },
        chart: chartData
      }
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get admin dashboard statistics
 * Provides overview statistics for admin dashboard
 */
const getAdminStats = async (req, res, next) => {
  try {
    // Get today's date range in IST
    const today = getCurrentIST();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    // Get yesterday's date range
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const startOfYesterday = new Date(yesterday);
    startOfYesterday.setHours(0, 0, 0, 0);
    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    // Run all queries in parallel for better performance
    const [
      todayCallsData,
      yesterdayCallsData,
      todayProductData,
      yesterdayProductData,
      todayPujaData,
      yesterdayPujaData,
      todayUsers,
      yesterdayUsers,
      totalUsers,
      totalAstrologers,
      totalActiveAstrologers
    ] = await Promise.all([
      // Today's call revenue
      calculateCallRevenue(startOfDay, endOfDay),
      
      // Yesterday's call revenue
      calculateCallRevenue(startOfYesterday, endOfYesterday),
      
      // Today's product revenue
      calculateProductRevenue(startOfDay, endOfDay),
      
      // Yesterday's product revenue
      calculateProductRevenue(startOfYesterday, endOfYesterday),
      
      // Today's puja revenue
      calculatePujaRevenue(startOfDay, endOfDay),
      
      // Yesterday's puja revenue
      calculatePujaRevenue(startOfYesterday, endOfYesterday),
      
      // Today's new users
      User.countDocuments({
        created_at: { $gte: startOfDay, $lte: endOfDay }
      }),
      
      // Yesterday's new users
      User.countDocuments({
        created_at: { $gte: startOfYesterday, $lte: endOfYesterday }
      }),
      
      // Total users
      User.countDocuments(),
      
      // Total astrologers
      Astrologer.countDocuments(),
      
      // Active astrologers
      Astrologer.countDocuments({ status: 'Active' })
    ]);

    // Calculate today's total revenue
    const todayTotalRevenue = todayCallsData.total + todayProductData.total + todayPujaData.total;
    
    // Calculate yesterday's total revenue
    const yesterdayTotalRevenue = yesterdayCallsData.total + yesterdayProductData.total + yesterdayPujaData.total;
    
    // Calculate revenue change percentage
    const revenueChangePercent = yesterdayTotalRevenue !== 0 
      ? ((todayTotalRevenue - yesterdayTotalRevenue) / yesterdayTotalRevenue) * 100 
      : 100; // If yesterday was zero, consider it 100% increase
    
    // Calculate user growth change percentage
    const userChangePercent = yesterdayUsers !== 0 
      ? ((todayUsers - yesterdayUsers) / yesterdayUsers) * 100 
      : 100; // If yesterday was zero, consider it 100% increase

    // Build response
    const response = {
      success: true,
      message: "Admin Dashboard Stats",
      data: {
        revenue: {
          today: {
            total: parseFloat(todayTotalRevenue.toFixed(2)),
            call: parseFloat(todayCallsData.total.toFixed(2)),
            product: parseFloat(todayProductData.total.toFixed(2)),
            puja: parseFloat(todayPujaData.total.toFixed(2))
          },
          yesterday: {
            total: parseFloat(yesterdayTotalRevenue.toFixed(2))
          },
          change_percent: parseFloat(revenueChangePercent.toFixed(2))
        },
        users: {
          total: totalUsers,
          new_today: todayUsers,
          new_yesterday: yesterdayUsers,
          change_percent: parseFloat(userChangePercent.toFixed(2))
        },
        astrologers: {
          total: totalAstrologers,
          active: totalActiveAstrologers,
          active_percent: totalAstrologers !== 0 
            ? parseFloat(((totalActiveAstrologers / totalAstrologers) * 100).toFixed(2)) 
            : 0
        }
      }
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

// Helper function for date range configuration
function getDateRangeConfig(period) {
  const now = getCurrentIST();
  let startDate, endDate, dateFormat, groupByField, includeUpcoming = false;

  switch (period) {
    case '7d':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 6); // Last 7 days including today
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      dateFormat = '%Y-%m-%d';
      groupByField = 'day';
      break;

    case '30d':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 29); // Last 30 days including today
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      dateFormat = '%Y-%m-%d';
      groupByField = 'day';
      break;

    case '12m':
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 11); // Last 12 months including current month
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      dateFormat = '%Y-%m';
      groupByField = 'month';
      break;

    case 'this_week':
      // Start from Monday of current week
      const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Adjust to make Monday the first day
      startDate = new Date(now);
      startDate.setDate(now.getDate() - diff);
      startDate.setHours(0, 0, 0, 0);

      // End date is Sunday of the same week
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);

      dateFormat = '%Y-%m-%d';
      groupByField = 'day';
      includeUpcoming = true; // Show all 7 days even if they haven't occurred yet
      break;

    case 'this_month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1); // First day of current month
      startDate.setHours(0, 0, 0, 0);

      // Last day of current month
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);

      dateFormat = '%Y-%m-%d';
      groupByField = 'day';
      includeUpcoming = true; // Show all days of the month even if they haven't occurred yet
      break;

    case 'ytd':
      startDate = new Date(now.getFullYear(), 0, 1); // January 1 of current year
      startDate.setHours(0, 0, 0, 0);

      // December 31 of current year
      endDate = new Date(now.getFullYear(), 11, 31);
      endDate.setHours(23, 59, 59, 999);

      dateFormat = '%Y-%m';
      groupByField = 'month';
      includeUpcoming = true; // Show all months of the year even if they haven't occurred yet
      break;
  }

  return { startDate, endDate, dateFormat, groupByField, includeUpcoming };
}

// Helper function to get revenue data for a specific service type
async function getRevenueData(type, startDate, endDate, dateFormat, groupByField, includeUpcoming, period) {
  let chartData, totals, breakdownByType;

  switch (type) {
    case 'call':
      // For calls, we need to aggregate AstrologerWalletHistory for credits
      chartData = await getCallRevenueChartData(startDate, endDate, dateFormat, groupByField, includeUpcoming, period);
      const callResults = await getCallRevenueTotals(startDate, endDate);
      totals = { total: callResults.total };
      breakdownByType = callResults.breakdownByType;
      break;
      
    case 'product':
      // For products, we need to aggregate ProductTransaction for completed transactions
      chartData = await getProductRevenueChartData(startDate, endDate, dateFormat, groupByField, includeUpcoming, period);
      const productResults = await getProductRevenueTotals(startDate, endDate);
      totals = { total: productResults.total };
      // No breakdown for products currently
      break;
      
    case 'puja':
      // For pujas, we need to aggregate PujaTransaction for completed transactions
      chartData = await getPujaRevenueChartData(startDate, endDate, dateFormat, groupByField, includeUpcoming, period);
      const pujaResults = await getPujaRevenueTotals(startDate, endDate);
      totals = { total: pujaResults.total };
      // No breakdown for pujas currently
      break;
  }

  return { chartData, totals, breakdownByType };
}

// Get call revenue chart data
async function getCallRevenueChartData(startDate, endDate, dateFormat, groupByField, includeUpcoming, period) {
  // For data retrieval, we only want to query up to the current date
  const queryEndDate = includeUpcoming ? new Date(getCurrentIST()) : endDate;

  // Use aggregation to get call revenue by date
  const pipeline = [
    {
      $match: {
        transaction_type: 'credit',
        timestamp: { $gte: startDate, $lte: queryEndDate }
      }
    },
    {
      $addFields: {
        formatted_date: {
          $dateToString: {
            format: dateFormat,
            date: '$timestamp',
            timezone: '+05:30'
          }
        }
      }
    },
    {
      $group: {
        _id: {
          date: '$formatted_date',
          transaction_for: { $ifNull: ['$transaction_for', 'other'] }
        },
        amount: { $sum: '$amount' }
      }
    },
    {
      $group: {
        _id: '$_id.date',
        total: { $sum: '$amount' },
        types: {
          $push: {
            type: '$_id.transaction_for',
            amount: '$amount'
          }
        }
      }
    },
    { $sort: { _id: 1 } }
  ];

  const results = await AstrologerWalletHistory.aggregate(pipeline);

  // Fill in missing dates with zero values
  return fillMissingDates(results, startDate, endDate, dateFormat, 'call', period);
}

// Get product revenue chart data
async function getProductRevenueChartData(startDate, endDate, dateFormat, groupByField, includeUpcoming, period) {
  // For data retrieval, we only want to query up to the current date
  const queryEndDate = includeUpcoming ? new Date(getCurrentIST()) : endDate;

  // Use aggregation to get product revenue by date
  const pipeline = [
    {
      $match: {
        status: 'COMPLETED', // Only completed transactions
        created_at: { $gte: startDate, $lte: queryEndDate }
      }
    },
    {
      $addFields: {
        formatted_date: {
          $dateToString: {
            format: dateFormat,
            date: '$created_at',
            timezone: '+05:30'
          }
        }
      }
    },
    {
      $group: {
        _id: '$formatted_date',
        total: { $sum: '$totalAmount' }
      }
    },
    { $sort: { _id: 1 } }
  ];

  const results = await ProductTransaction.aggregate(pipeline);

  // Fill in missing dates with zero values
  return fillMissingDates(results, startDate, endDate, dateFormat, 'product', period);
}

// Get puja revenue chart data
async function getPujaRevenueChartData(startDate, endDate, dateFormat, groupByField, includeUpcoming, period) {
  // For data retrieval, we only want to query up to the current date
  const queryEndDate = includeUpcoming ? new Date(getCurrentIST()) : endDate;

  // Use aggregation to get puja revenue by date
  const pipeline = [
    {
      $match: {
        status: 'COMPLETED', // Only completed transactions
        created_at: { $gte: startDate, $lte: queryEndDate }
      }
    },
    {
      $addFields: {
        formatted_date: {
          $dateToString: {
            format: dateFormat,
            date: '$created_at',
            timezone: '+05:30'
          }
        }
      }
    },
    {
      $group: {
        _id: '$formatted_date',
        total: { $sum: '$totalAmount' }
      }
    },
    { $sort: { _id: 1 } }
  ];

  const results = await PujaTransaction.aggregate(pipeline);

  // Fill in missing dates with zero values
  return fillMissingDates(results, startDate, endDate, dateFormat, 'puja', period);
}

// Get user registration chart data
async function getUserRegistrationData(startDate, endDate, dateFormat, groupByField, includeUpcoming, period) {
  // For data retrieval, we only want to query up to the current date
  const queryEndDate = includeUpcoming ? new Date(getCurrentIST()) : endDate;

  // Use aggregation to get user registrations by date
  const pipeline = [
    {
      $match: {
        created_at: { $gte: startDate, $lte: queryEndDate }
      }
    },
    {
      $addFields: {
        formatted_date: {
          $dateToString: {
            format: dateFormat,
            date: '$created_at',
            timezone: '+05:30'
          }
        }
      }
    },
    {
      $group: {
        _id: '$formatted_date',
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ];

  const results = await User.aggregate(pipeline);

  // Transform the aggregation results to match the expected format
  const transformedResults = results.map(item => ({
    _id: item._id,
    total: item.count
  }));

  // Fill in missing dates with zero values
  return fillMissingDates(transformedResults, startDate, endDate, dateFormat, 'user', period);
}

// Get call revenue totals with breakdown by type
async function getCallRevenueTotals(startDate, endDate) {
  const results = await AstrologerWalletHistory.aggregate([
    {
      $match: {
        transaction_type: 'credit',
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: { $ifNull: ['$transaction_for', 'other'] },
        amount: { $sum: '$amount' }
      }
    }
  ]);

  // Calculate total revenue
  const total = results.reduce((sum, item) => sum + item.amount, 0);
  
  // Create breakdown by type
  const breakdownByType = {};
  results.forEach(item => {
    breakdownByType[item._id] = item.amount;
  });

  // Ensure chat and voice are always present
  if (!breakdownByType.chat) breakdownByType.chat = 0;
  if (!breakdownByType.voice) breakdownByType.voice = 0;

  return { total, breakdownByType };
}

// Get product revenue totals
async function getProductRevenueTotals(startDate, endDate) {
  const result = await ProductTransaction.aggregate([
    {
      $match: {
        status: 'COMPLETED',
        created_at: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$totalAmount' }
      }
    }
  ]);

  return { total: result.length > 0 ? result[0].total : 0 };
}

// Get puja revenue totals
async function getPujaRevenueTotals(startDate, endDate) {
  const result = await PujaTransaction.aggregate([
    {
      $match: {
        status: 'COMPLETED',
        created_at: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$totalAmount' }
      }
    }
  ]);

  return { total: result.length > 0 ? result[0].total : 0 };
}

// Helper functions for daily revenue calculations
async function calculateCallRevenue(startDate, endDate) {
  const result = await AstrologerWalletHistory.aggregate([
    {
      $match: {
        transaction_type: 'credit',
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: { $ifNull: ['$transaction_for', 'other'] },
        amount: { $sum: '$amount' }
      }
    }
  ]);

  // Calculate total
  const total = result.reduce((sum, item) => sum + item.amount, 0);
  
  // Get breakdown by type
  const chat = result.find(item => item._id === 'chat')?.amount || 0;
  const voice = result.find(item => item._id === 'voice')?.amount || 0;

  return { total, chat, voice };
}

async function calculateProductRevenue(startDate, endDate) {
  const result = await ProductTransaction.aggregate([
    {
      $match: {
        status: 'COMPLETED',
        created_at: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$totalAmount' }
      }
    }
  ]);

  return { total: result.length > 0 ? result[0].total : 0 };
}

async function calculatePujaRevenue(startDate, endDate) {
  const result = await PujaTransaction.aggregate([
    {
      $match: {
        status: 'COMPLETED',
        created_at: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$totalAmount' }
      }
    }
  ]);

  return { total: result.length > 0 ? result[0].total : 0 };
}

// Fill in missing dates with zero values
function fillMissingDates(results, startDate, endDate, dateFormat, type, period) {
  const dateMap = {};

  // Create a map of existing dates
  results.forEach(item => {
    dateMap[item._id] = {
      total: item.total,
      types: {}
    };

    // If types data exists, create a map of types for each date
    if (item.types) {
      item.types.forEach(typeData => {
        const typeKey = typeData.type || 'other';
        dateMap[item._id].types[typeKey] = type === 'call' ? typeData.amount : typeData.count;
      });
    }
  });

  const filledResults = [];
  const current = new Date(startDate);
  const realEndDate = new Date(endDate);

  // Loop through all dates in the range
  while (current <= realEndDate) {
    let formattedDate;

    if (dateFormat === '%Y-%m-%d') {
      formattedDate = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;

      const existingData = dateMap[formattedDate] || { total: 0, types: {} };

      // Format date for display based on period
      let displayDate;

      if (period === '7d' || period === '30d') {
        // Format like "Feb 22"
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        displayDate = `${monthNames[current.getMonth()]} ${current.getDate()}`;
      } else if (period === 'this_week') {
        // Format like "Mon"
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        displayDate = dayNames[current.getDay()];
      } else if (period === 'this_month') {
        // Format like "Feb 1"
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        displayDate = `${monthNames[current.getMonth()]} ${current.getDate()}`;
      }

      // Create the result object
      const resultObj = {
        _id: formattedDate,
        date: displayDate,
        fullDate: formattedDate,
        total: existingData.total || 0,
        day: getDayName(current)
      };

      // Add type-specific fields based on data type
      if (type === 'call' && existingData.types) {
        resultObj.voice = existingData.types.voice || 0;
        resultObj.chat = existingData.types.chat || 0;
      }

      filledResults.push(resultObj);
      current.setDate(current.getDate() + 1);
    } else if (dateFormat === '%Y-%m') {
      formattedDate = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;

      const existingData = dateMap[formattedDate] || { total: 0, types: {} };

      // Format date for display
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const displayDate = monthNames[current.getMonth()];

      // Create the result object
      const resultObj = {
        _id: formattedDate,
        date: displayDate,
        fullDate: formattedDate,
        total: existingData.total || 0,
        month: getMonthName(current)
      };

      // Add type-specific fields based on data type
      if (type === 'call' && existingData.types) {
        resultObj.voice = existingData.types.voice || 0;
        resultObj.chat = existingData.types.chat || 0;
      }

      filledResults.push(resultObj);
      current.setMonth(current.getMonth() + 1);
    }
  }

  return filledResults;
}

// Combine chart data from multiple services for the 'all' type
function combineChartData(callData, productData, pujaData, dateFormat) {
  // Create a map using date as key
  const combinedMap = {};
  
  // Process call data
  callData.forEach(item => {
    if (!combinedMap[item._id]) {
      combinedMap[item._id] = {
        _id: item._id,
        date: item.date,
        fullDate: item.fullDate,
        total: 0,
        call: 0,
        product: 0,
        puja: 0
      };
      
      // Add day or month depending on format
      if (item.day) combinedMap[item._id].day = item.day;
      if (item.month) combinedMap[item._id].month = item.month;
    }
    
    combinedMap[item._id].call = item.total;
    combinedMap[item._id].total += item.total;
  });
  
  // Process product data
  productData.forEach(item => {
    if (!combinedMap[item._id]) {
      combinedMap[item._id] = {
        _id: item._id,
        date: item.date,
        fullDate: item.fullDate,
        total: 0,
        call: 0,
        product: 0,
        puja: 0
      };
      
      // Add day or month depending on format
      if (item.day) combinedMap[item._id].day = item.day;
      if (item.month) combinedMap[item._id].month = item.month;
    }
    
    combinedMap[item._id].product = item.total;
    combinedMap[item._id].total += item.total;
  });
  
  // Process puja data
  pujaData.forEach(item => {
    if (!combinedMap[item._id]) {
      combinedMap[item._id] = {
        _id: item._id,
        date: item.date,
        fullDate: item.fullDate,
        total: 0,
        call: 0,
        product: 0,
        puja: 0
      };
      
      // Add day or month depending on format
      if (item.day) combinedMap[item._id].day = item.day;
      if (item.month) combinedMap[item._id].month = item.month;
    }
    
    combinedMap[item._id].puja = item.total;
    combinedMap[item._id].total += item.total;
  });
  
  // Convert map to array and sort by date
  return Object.values(combinedMap).sort((a, b) => a._id.localeCompare(b._id));
}

// Helper functions
function getDayName(date) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

function getMonthName(date) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return months[date.getMonth()];
}


//for trending productsconst mongoose = require('mongoose');
/**
 * Get top selling products for admin dashboard
 * Returns the top products by sales volume for a specified time period
 */
const getTopSellingProducts = async (req, res, next) => {
  try {
    // Get query parameters with defaults
    const { period = '7d', limit = 3 } = req.query;

    // Validate input
    const validPeriods = ['7d', '30d', '12m', 'this_week', 'this_month', 'ytd', 'all_time'];
    if (!validPeriods.includes(period)) {
      throw new ApiError('Invalid period parameter. Allowed values: 7d, 30d, 12m, this_week, this_month, ytd, all_time', 400);
    }

    // Convert limit to number and validate
    const numLimit = parseInt(limit, 10);
    if (isNaN(numLimit) || numLimit < 1 || numLimit > 50) {
      throw new ApiError('Invalid limit parameter. Must be a number between 1 and 50.', 400);
    }

    // Calculate date range based on period
    let startDate, endDate;
    if (period !== 'all_time') {
      const dateRange = getDateRangeForPeriod(period);
      startDate = dateRange.startDate;
      endDate = dateRange.endDate;
    }

    // Create the match condition for MongoDB aggregation
    const matchCondition = {
      // status: 'COMPLETED' // Only completed transactions
    };

    // Add date range if not 'all_time'
    if (period !== 'all_time') {
      matchCondition.created_at = { $gte: startDate, $lte: endDate };
    }

    // Aggregate to find top selling products
    const topProducts = await ProductTransaction.aggregate([
      // Stage 1: Match completed transactions in the date range
      { $match: matchCondition },
      
      // Stage 2: Unwind products array to treat each product as a separate document
      { $unwind: '$products' },
      
      // Stage 3: Group by product ID and calculate total quantity sold
      {
        $group: {
          _id: '$products.productId',
          productName: { $first: '$products.name' },
          totalQuantity: { $sum: '$products.quantity' },
          totalRevenue: { $sum: { $multiply: ['$products.quantity', '$products.unitPrice'] } },
          transactions: { $sum: 1 }
        }
      },
      
      // Stage 4: Sort by total quantity in descending order
      { $sort: { totalQuantity: -1 } },
      
      // Stage 5: Limit results to the specified number
      { $limit: numLimit },
      
      // Stage 6: Project only the fields we need
      {
        $project: {
          _id: 1,
          productName: 1,
          totalQuantity: 1,
          totalRevenue: 1,
          transactions: 1
        }
      }
    ]);

    // If needed, get additional product details from Product model
    const topProductsWithDetails = await Promise.all(
      topProducts.map(async (product) => {
        const productDetails = await Product.findById(product._id).select('name img actualPrice');
        console.log('prouct detials', productDetails)
        return {
          productId: product._id,
          name: productDetails.name,
          totalQuantity: product.totalQuantity,
          totalRevenue: parseFloat(product.totalRevenue.toFixed(2)),
          transactions: product.transactions,
          // Include additional details if available
          imageUrl: productDetails?.img?.[0] || '',
          currentPrice: productDetails?.actualPrice || 0
        };
      })
    );

    // Build response
    const response = {
      success: true,
      message: `Top ${numLimit} Selling Products for ${getPeriodName(period)}`,
      data: {
        period,
        products: topProductsWithDetails,
        periodRange: period !== 'all_time' ? {
          start: startDate,
          end: endDate
        } : null
      }
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get trending products (fastest growing in recent period)
 * Shows products with the highest growth rate compared to previous period
 */
const getTrendingProducts = async (req, res, next) => {
  try {
    // Get query parameters with defaults
    const { period = '7d', limit = 3 } = req.query;

    // Validate input
    const validPeriods = ['7d', '30d', 'this_month'];
    if (!validPeriods.includes(period)) {
      throw new ApiError('Invalid period parameter for trending. Allowed values: 7d, 30d, this_month', 400);
    }

    // Convert limit to number and validate
    const numLimit = parseInt(limit, 10);
    if (isNaN(numLimit) || numLimit < 1 || numLimit > 50) {
      throw new ApiError('Invalid limit parameter. Must be a number between 1 and 50.', 400);
    }

    // Calculate current period date range
    const currentPeriod = getDateRangeForPeriod(period);
    const currentStartDate = currentPeriod.startDate;
    const currentEndDate = currentPeriod.endDate;

    // Calculate previous period date range
    let previousStartDate, previousEndDate;
    
    if (period === '7d') {
      // Previous 7 days
      previousEndDate = new Date(currentStartDate);
      previousEndDate.setSeconds(previousEndDate.getSeconds() - 1);
      previousStartDate = new Date(previousEndDate);
      previousStartDate.setDate(previousStartDate.getDate() - 7);
    } else if (period === '30d') {
      // Previous 30 days
      previousEndDate = new Date(currentStartDate);
      previousEndDate.setSeconds(previousEndDate.getSeconds() - 1);
      previousStartDate = new Date(previousEndDate);
      previousStartDate.setDate(previousStartDate.getDate() - 30);
    } else if (period === 'this_month') {
      // Previous month
      const currentMonth = currentStartDate.getMonth();
      const currentYear = currentStartDate.getFullYear();
      previousStartDate = new Date(currentYear, currentMonth - 1, 1);
      previousEndDate = new Date(currentYear, currentMonth, 0);
      previousEndDate.setHours(23, 59, 59, 999);
    }

    // Get sales data for current period
    const currentPeriodSales = await getProductSalesForPeriod(currentStartDate, currentEndDate);
    
    // Get sales data for previous period
    const previousPeriodSales = await getProductSalesForPeriod(previousStartDate, previousEndDate);

    // Calculate growth rates
    const productsWithGrowth = calculateGrowthRates(currentPeriodSales, previousPeriodSales);
    
    // Sort by growth rate and limit results
    const trendingProducts = productsWithGrowth
      .sort((a, b) => b.growthRate - a.growthRate)
      .slice(0, numLimit);

    // Get additional product details
    const trendingProductsWithDetails = await Promise.all(
      trendingProducts.map(async (product) => {
        const productDetails = await Product.findById(product.productId).select('name category imageUrl price');
        
        return {
          ...product,
          category: productDetails?.category || '',
          imageUrl: productDetails?.imageUrl || '',
          currentPrice: productDetails?.price || 0
        };
      })
    );

    // Build response
    const response = {
      success: true,
      message: `Trending Products for ${getPeriodName(period)}`,
      data: {
        period,
        products: trendingProductsWithDetails,
        currentPeriod: {
          start: currentStartDate,
          end: currentEndDate
        },
        previousPeriod: {
          start: previousStartDate,
          end: previousEndDate
        }
      }
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get sales by category
 * Returns sales data grouped by product category
 */
const getSalesByCategory = async (req, res, next) => {
  try {
    // Get query parameters with defaults
    const { period = '30d' } = req.query;

    // Validate input
    const validPeriods = ['7d', '30d', '12m', 'this_week', 'this_month', 'ytd', 'all_time'];
    if (!validPeriods.includes(period)) {
      throw new ApiError('Invalid period parameter', 400);
    }

    // Calculate date range based on period
    let startDate, endDate;
    if (period !== 'all_time') {
      const dateRange = getDateRangeForPeriod(period);
      startDate = dateRange.startDate;
      endDate = dateRange.endDate;
    }

    // Create the match condition for MongoDB aggregation
    const matchCondition = {
      status: 'COMPLETED' // Only completed transactions
    };

    // Add date range if not 'all_time'
    if (period !== 'all_time') {
      matchCondition.created_at = { $gte: startDate, $lte: endDate };
    }

    // First get all products sold in the period
    const productSales = await ProductTransaction.aggregate([
      { $match: matchCondition },
      { $unwind: '$products' },
      {
        $group: {
          _id: '$products.productId',
          totalQuantity: { $sum: '$products.quantity' },
          totalRevenue: { $sum: { $multiply: ['$products.quantity', '$products.unitPrice'] } }
        }
      }
    ]);

    // Get product details including category
    const productIds = productSales.map(p => p._id);
    const products = await Product.find({ _id: { $in: productIds } }).select('_id name category');

    // Create a map of product ID to category
    const productCategoryMap = {};
    products.forEach(product => {
      productCategoryMap[product._id.toString()] = product.category || 'Uncategorized';
    });

    // Group sales by category
    const categorySales = {};
    productSales.forEach(sale => {
      const productId = sale._id.toString();
      const category = productCategoryMap[productId] || 'Uncategorized';
      
      if (!categorySales[category]) {
        categorySales[category] = {
          totalQuantity: 0,
          totalRevenue: 0,
          productCount: 0
        };
      }
      
      categorySales[category].totalQuantity += sale.totalQuantity;
      categorySales[category].totalRevenue += sale.totalRevenue;
      categorySales[category].productCount += 1;
    });

    // Convert to array and sort by revenue
    const categorySalesArray = Object.entries(categorySales).map(([category, data]) => ({
      category,
      totalQuantity: data.totalQuantity,
      totalRevenue: parseFloat(data.totalRevenue.toFixed(2)),
      productCount: data.productCount
    })).sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Calculate total revenue across all categories
    const totalRevenue = categorySalesArray.reduce((sum, cat) => sum + cat.totalRevenue, 0);

    // Add percentage of total revenue
    const categorySalesWithPercentage = categorySalesArray.map(cat => ({
      ...cat,
      percentageOfRevenue: parseFloat(((cat.totalRevenue / totalRevenue) * 100).toFixed(2))
    }));

    // Build response
    const response = {
      success: true,
      message: `Sales by Category for ${getPeriodName(period)}`,
      data: {
        period,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        categories: categorySalesWithPercentage,
        periodRange: period !== 'all_time' ? {
          start: startDate,
          end: endDate
        } : null
      }
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

// Helper function to get date range for a specific period
function getDateRangeForPeriod(period) {
  const now = getCurrentIST();
  let startDate, endDate;

  switch (period) {
    case '7d':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 6); // Last 7 days including today
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      break;

    case '30d':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 29); // Last 30 days including today
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      break;

    case '12m':
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 11); // Last 12 months including current month
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      break;

    case 'this_week':
      // Start from Monday of current week
      const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Adjust to make Monday the first day
      startDate = new Date(now);
      startDate.setDate(now.getDate() - diff);
      startDate.setHours(0, 0, 0, 0);

      // End date is Sunday of the same week
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      break;

    case 'this_month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1); // First day of current month
      startDate.setHours(0, 0, 0, 0);

      // Last day of current month
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
      break;

    case 'ytd':
      startDate = new Date(now.getFullYear(), 0, 1); // January 1 of current year
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      break;
  }

  return { startDate, endDate };
}

// Helper function to get product sales data for a specific period
async function getProductSalesForPeriod(startDate, endDate) {
  const results = await ProductTransaction.aggregate([
    {
      $match: {
        status: 'COMPLETED',
        created_at: { $gte: startDate, $lte: endDate }
      }
    },
    { $unwind: '$products' },
    {
      $group: {
        _id: '$products.productId',
        productName: { $first: '$products.name' },
        totalQuantity: { $sum: '$products.quantity' },
        totalRevenue: { $sum: { $multiply: ['$products.quantity', '$products.unitPrice'] } },
        transactions: { $sum: 1 }
      }
    }
  ]);

  return results.map(item => ({
    productId: item._id,
    name: item.productName,
    totalQuantity: item.totalQuantity,
    totalRevenue: parseFloat(item.totalRevenue.toFixed(2)),
    transactions: item.transactions
  }));
}

// Helper function to calculate growth rates between two periods
function calculateGrowthRates(currentPeriodSales, previousPeriodSales) {
  // Create a map of product IDs to previous period sales
  const previousSalesMap = {};
  previousPeriodSales.forEach(item => {
    previousSalesMap[item.productId.toString()] = item;
  });

  // Calculate growth rate for each product in current period
  return currentPeriodSales.map(currentItem => {
    const productId = currentItem.productId.toString();
    const previousItem = previousSalesMap[productId];
    
    let growthRate = 0;
    let previousQuantity = 0;
    
    if (previousItem) {
      previousQuantity = previousItem.totalQuantity;
      // Calculate growth rate as a percentage
      if (previousItem.totalQuantity > 0) {
        growthRate = ((currentItem.totalQuantity - previousItem.totalQuantity) / previousItem.totalQuantity) * 100;
      } else {
        // If previous quantity was 0, this is infinite growth, so cap it at a high value
        growthRate = 1000; // 1000% growth
      }
    } else {
      // If the product wasn't sold in the previous period, this is new, so 100% growth
      growthRate = 1000; // 1000% growth
    }

    return {
      ...currentItem,
      previousQuantity,
      quantityChange: currentItem.totalQuantity - previousQuantity,
      growthRate: parseFloat(growthRate.toFixed(2))
    };
  });
}

// Helper function to get a readable name for a period
function getPeriodName(period) {
  switch (period) {
    case '7d':
      return 'Last 7 Days';
    case '30d':
      return 'Last 30 Days';
    case '12m':
      return 'Last 12 Months';
    case 'this_week':
      return 'This Week';
    case 'this_month':
      return 'This Month';
    case 'ytd':
      return 'Year to Date';
    case 'all_time':
      return 'All Time';
    default:
      return period;
  }
}

module.exports = {
  getTodayMetrics,
  getRealTimeMetrics,
  getTrends,
  getNotifications,
//CHART dATA
  getAdminRevenueDashboard, 
  getAdminUserDashboard, 
  getAdminStats ,

  //PRODUCTS
  getTopSellingProducts,
  getTrendingProducts,
  getSalesByCategory
}