const mongoose = require('mongoose');
const { getCurrentIST } = require('../../utils/timeUtils');
const { ApiError } = require('../../errorHandler');
const { CallChatHistory, AstrologerWalletHistory, Astrologer } = require('../../models');

const getAstroDashboard = async (req, res, next) => {
  try {
    // const astrologer_id = '67b2e48b094a099dcf83352b'; // Get from authenticated user
    const astrologer_id =  req.astrologer._id
    const { type = 'call', period = '7d' } = req.query;

    console.log('type', type)
    console.log('period', period)

    // Validate input
    if (!['call', 'earning'].includes(type)) {
      throw new ApiError('Invalid type parameter. Allowed values: call, earning', 400);
    }

    const validPeriods = ['7d', '30d', '12m', 'this_week', 'this_month', 'ytd'];
    if (!validPeriods.includes(period)) {
      throw new ApiError('Invalid period parameter', 400);
    }

    // Calculate date range based on period
    const { startDate, endDate, dateFormat, groupByField, includeUpcoming } = getDateRangeConfig(period);

    // Get chart data
    const chartData = await getChartData({
      type,
      astrologer_id,
      startDate,
      endDate,
      dateFormat,
      groupByField,
      includeUpcoming,
      period
    });

    // Get totals and breakdowns by type
    const { total, breakdownByType } = await getTotalsAndBreakdown({
      type,
      astrologer_id,
      startDate,
      endDate
    });

    // Build response
    const response = {
      success: true,
      message : "Astrologer Dashboard Chart Data",
      data: {
        period,
        type,
        total,
        breakdown_by_type: breakdownByType,
        chart: chartData
      }
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

// Get date range configuration based on period
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

// Get chart data based on configuration
async function getChartData({ type, astrologer_id, startDate, endDate, dateFormat, groupByField, includeUpcoming, period }) {
  const Model = type === 'call' ? CallChatHistory : AstrologerWalletHistory;

  // For data retrieval, we only want to query up to the current date
  const queryEndDate = includeUpcoming ? new Date(getCurrentIST()) : endDate;

  const matchQuery = {
    astrologer_id: new mongoose.Types.ObjectId(astrologer_id),
    [type === 'call' ? 'created_at' : 'timestamp']: { $gte: startDate, $lte: queryEndDate }
  };

  if (type === 'earning') {
    matchQuery.transaction_type = 'credit';
  }

  // For call type, we need to get breakdown by call_type
  let pipeline;
  if (type === 'call') {
    pipeline = [
      { $match: matchQuery },
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
          _id: {
            date: '$formatted_date',
            call_type: '$call_type'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          total: { $sum: '$count' },
          types: {
            $push: {
              type: '$_id.call_type',
              count: '$count'
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ];
  } else {
    // For earning type, we need to get breakdown by call_type using transaction_for field
    pipeline = [
      { $match: matchQuery },
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
  }

  const results = await Model.aggregate(pipeline);

  // Fill in missing dates with zero values
  const filledResults = fillMissingDates(results, startDate, endDate, dateFormat, type, period);

  // Format the results based on period type
  return formatChartData(filledResults, groupByField, type, period);
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

    // Create a map of types for each date
    item.types.forEach(typeData => {
      dateMap[item._id].types[typeData.type || 'other'] = type === 'call' ? typeData.count : typeData.amount;
    });
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

      // Ensure chat and voice types are always present for both call and earning
      if (!existingData.types.chat) existingData.types.chat = 0;
      if (!existingData.types.voice) existingData.types.voice = 0;

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

      filledResults.push({
        _id: formattedDate,
        date: displayDate,
        fullDate: formattedDate,
        total: existingData.total || 0,
        day: getDayName(current),
        voice: existingData.types.voice || 0,
        chat: existingData.types.chat || 0
      });

      current.setDate(current.getDate() + 1);
    } else if (dateFormat === '%Y-%m') {
      formattedDate = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;

      const existingData = dateMap[formattedDate] || { total: 0, types: {} };

      // Ensure chat and voice types are always present for both call and earning
      if (!existingData.types.chat) existingData.types.chat = 0;
      if (!existingData.types.voice) existingData.types.voice = 0;

      // Format date for display based on period
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const displayDate = monthNames[current.getMonth()];

      filledResults.push({
        _id: formattedDate,
        date: displayDate,
        fullDate: formattedDate,
        total: existingData.total || 0,
        month: getMonthName(current),
        voice: existingData.types.voice || 0,
        chat: existingData.types.chat || 0
      });

      current.setMonth(current.getMonth() + 1);
    }
  }

  return filledResults;
}

// Format chart data based on grouping field
function formatChartData(results, groupByField, type, period) {
  if (groupByField === 'day') {
    return results.map(item => ({
      date: item.date,
      fullDate: item.fullDate,
      total: item.total,
      day: item.day,
      voice: item.voice || 0,
      chat: item.chat || 0
    }));
  } else if (groupByField === 'month') {
    return results.map(item => ({
      date: item.date,
      fullDate: item.fullDate,
      total: item.total,
      month: item.month,
      voice: item.voice || 0,
      chat: item.chat || 0
    }));
  }

  return results;
}

// Get totals and breakdown by type
async function getTotalsAndBreakdown({ type, astrologer_id, startDate, endDate }) {
  if (type === 'call') {
    const results = await CallChatHistory.aggregate([
      {
        $match: {
          astrologer_id: new mongoose.Types.ObjectId(astrologer_id),
          created_at: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$call_type',
          count: { $sum: 1 }
        }
      }
    ]);

    // Calculate total and create breakdown by type
    const total = results.reduce((sum, item) => sum + item.count, 0);
    const breakdownByType = {};

    results.forEach(item => {
      breakdownByType[item._id || 'other'] = item.count;
    });

    // Ensure chat and voice are always present
    if (!breakdownByType.chat) breakdownByType.chat = 0;
    if (!breakdownByType.voice) breakdownByType.voice = 0;

    return { total, breakdownByType };
  } else {
    // Handle earnings type with breakdown by transaction_for field
    const results = await AstrologerWalletHistory.aggregate([
      {
        $match: {
          astrologer_id: new mongoose.Types.ObjectId(astrologer_id),
          timestamp: { $gte: startDate, $lte: endDate },
          transaction_type: 'credit'
        }
      },
      {
        $group: {
          _id: { $ifNull: ['$transaction_for', 'other'] },
          amount: { $sum: '$amount' }
        }
      }
    ]);

    // Calculate total and create breakdown by type
    const total = results.reduce((sum, item) => sum + item.amount, 0);
    const breakdownByType = {};

    results.forEach(item => {
      breakdownByType[item._id] = item.amount;
    });

    // Ensure chat and voice are always present
    if (!breakdownByType.chat) breakdownByType.chat = 0;
    if (!breakdownByType.voice) breakdownByType.voice = 0;

    return { total, breakdownByType };
  }
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

const getAstrologerStats = async (req, res, next) => {
  try {
    const astrologer_id =  req.astrologer._id; // Get from authenticated user

    const astrologer = await Astrologer.findById(astrologer_id).select("rating wallet total_reviews call_counts");
    if (!astrologer) {
      throw new ApiError('Astrologer not found or not active', 404);
    }

    // Get today's date range in IST
    const today = getCurrentIST();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    // Run all queries in parallel using Promise.all for better performance
    const [todayCallsData, totalCalls] = await Promise.all([
      // Query 1: Get today's calls with breakdown by type
      CallChatHistory.aggregate([
        {
          $match: {
            astrologer_id: new mongoose.Types.ObjectId(astrologer_id),
            created_at: { $gte: startOfDay, $lte: endOfDay }
          }
        },
        {
          $facet: {
            // Count calls by type and sum earnings
            byType: [
              {
                $group: {
                  _id: { $ifNull: ['$call_type', 'other'] },
                  count: { $sum: 1 },
                  earnings: { $sum: { $ifNull: ['$astro_cut', 0] } }
                }
              }
            ],
            // Get total count
            total: [
              { $count: 'count' }
            ]
          }
        }
      ]),

      // Query 2: Get total all-time calls (just count for efficiency)
      CallChatHistory.countDocuments({
        astrologer_id: new mongoose.Types.ObjectId(astrologer_id)
      })
    ]);

    // Process today's calls data
    const todayCalls = {
      total: 0,
      chat: 0,
      voice: 0
    };

    // Initialize earnings breakdown object
    const todayEarnings = {
      total: 0,
      chat: 0,
      voice: 0
    };

    // Process call type breakdown
    if (todayCallsData[0].byType.length > 0) {
      todayCallsData[0].byType.forEach(item => {
        if (item._id === 'chat') {
          todayCalls.chat = item.count;
          todayEarnings.chat = parseFloat(item.earnings.toFixed(2));
        } else if (item._id === 'voice') {
          todayCalls.voice = item.count;
          todayEarnings.voice = parseFloat(item.earnings.toFixed(2));
        }
        todayEarnings.total += item.earnings;
      });
    }

    // Format total earnings with 2 decimal places
    todayEarnings.total = parseFloat(todayEarnings.total.toFixed(2));

    // Set total calls
    todayCalls.total = todayCallsData[0].total.length > 0 ? todayCallsData[0].total[0].count : 0;

    // Build response
    const response = {
      success: true,
      message : "Astrologer Stats",
      data: {
        today_earnings: todayEarnings,
        today_calls: todayCalls,
        total_calls: totalCalls,
        astrologer: astrologer
      }
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

const getAstrologerOnlineStats = async (req, res, next) => {
  try {
    const astrologer_id =  req.astrologer._id; // Get from authenticated user

    // Fetch astrologer with only name and wallet fields
    const astrologer = await Astrologer.findById(astrologer_id).select("name wallet is_chat is_voice_call is_chat_online is_voice_online");

    if (!astrologer) {
      throw new ApiError('Astrologer not found', 404);
    }

    // Return response
    res.json({
      success: true,
      message : "Astrologer Profile Data",
      data: astrologer
    });
  } catch (error) {
    next(error);
  }
};


module.exports = { getAstroDashboard, getAstrologerStats, getAstrologerOnlineStats };