const { ApiError } = require('../../errorHandler');
const mongoose = require('mongoose');
const { getCurrentIST } = require('../../utils/timeUtils');
const { User, Astrologer, CallChatHistory, UserWalletHistory, AstrologerWalletHistory, AdminCommissionHistory, ProductTransaction, 
  PujaTransaction, } = require('../../models');

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

module.exports = {
  getTodayMetrics,
  getRealTimeMetrics,
  getTrends,
  getNotifications,
//CHART dATA
  getAdminRevenueDashboard, 
  getAdminUserDashboard, 
  getAdminStats 
}