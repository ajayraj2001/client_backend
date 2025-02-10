const mongoose = require('mongoose');
const { getCurrentIST } = require('../../utils/timeUtils');
const { ApiError } = require('../../errorHandler');
const { CallChatHistory, AstrologerWalletHistory } = require('../../models');

const getAstroDashboard = async (req, res, next) => {
  try {
    const  astrologer_id  = req.astrologer._id;
    const { type = 'call', period = '7d' } = req.query;

    // Validate input
    if (!['call', 'earning'].includes(type)) {
      throw new ApiError('Invalid type parameter. Allowed values: call, earning', 400);
    }

    const validPeriods = ['7d', '30d', '12m', 'this_week', 'this_month', 'ytd'];
    if (!validPeriods.includes(period)) {
      throw new ApiError('Invalid period parameter', 400);
    }

    // Date range calculation
    const getDateRange = () => {
      const now = getCurrentIST();
      let current, previous, lastYear;

      switch (period) {
        case '7d':
          current = {
            start: new Date(now - 7 * 864e5),
            end: now
          };
          previous = {
            start: new Date(now - 14 * 864e5),
            end: new Date(now - 7 * 864e5)
          };
          lastYear = {
            start: new Date(now.setFullYear(now.getFullYear() - 1) - 7 * 864e5),
            end: new Date(now - 7 * 864e5)
          };
          break;

        case '30d':
          current = {
            start: new Date(now - 30 * 864e5),
            end: now
          };
          previous = {
            start: new Date(now - 60 * 864e5),
            end: new Date(now - 30 * 864e5)
          };
          lastYear = {
            start: new Date(now.setFullYear(now.getFullYear() - 1) - 30 * 864e5),
            end: new Date(now - 30 * 864e5)
          };
          break;

        case '12m':
          current = {
            start: new Date(now.getFullYear(), now.getMonth() - 11, 1),
            end: now
          };
          previous = {
            start: new Date(now.getFullYear() - 1, now.getMonth() - 11, 1),
            end: new Date(now.getFullYear() - 1, now.getMonth(), 0)
          };
          lastYear = {
            start: new Date(now.getFullYear() - 2, now.getMonth() - 11, 1),
            end: new Date(now.getFullYear() - 2, now.getMonth(), 0)
          };
          break;

        case 'this_week':
          const day = now.getDay(); // Sunday = 0
          const diff = now.getDate() - day + (day === 0 ? -6 : 1);
          current = {
            start: new Date(now.setDate(diff)),
            end: now
          };
          previous = {
            start: new Date(now - 7 * 864e5),
            end: new Date(now - 7 * 864e5 + 6 * 864e5)
          };
          lastYear = {
            start: new Date(now.setFullYear(now.getFullYear() - 1)),
            end: new Date(now + 6 * 864e5)
          };
          break;

        case 'this_month':
          current = {
            start: new Date(now.getFullYear(), now.getMonth(), 1),
            end: now
          };
          previous = {
            start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
            end: new Date(now.getFullYear(), now.getMonth(), 0)
          };
          lastYear = {
            start: new Date(now.getFullYear() - 1, now.getMonth(), 1),
            end: new Date(now.getFullYear() - 1, now.getMonth() + 1, 0)
          };
          break;

        case 'ytd':
          current = {
            start: new Date(now.getFullYear(), 0, 1),
            end: now
          };
          previous = {
            start: new Date(now.getFullYear() - 1, 0, 1),
            end: new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
          };
          lastYear = {
            start: new Date(now.getFullYear() - 2, 0, 1),
            end: new Date(now.getFullYear() - 2, now.getMonth(), now.getDate())
          };
          break;
      }

      return { current, previous, lastYear };
    };

    // Data aggregation
    const getAggregatedData = async (start, end) => {
      const Model = type === 'call' ? CallChatHistory : AstrologerWalletHistory;
      const match = {
        astrologer_id: mongoose.Types.ObjectId(astrologer_id),
        [type === 'call' ? 'created_at' : 'timestamp']: { $gte: start, $lte: end }
      };

      if (type === 'earning') match.transaction_type = 'credit';

      return Model.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            total: { $sum: type === 'call' ? 1 : '$amount' }
          }
        }
      ]);
    };

    // Get all data
    const { current, previous, lastYear } = getDateRange();
    const [currentData, previousData, lastYearData] = await Promise.all([
      getAggregatedData(current.start, current.end),
      getAggregatedData(previous.start, previous.end),
      getAggregatedData(lastYear.start, lastYear.end)
    ]);

    // Process results
    const processResult = (data) => ({
      total: data[0]?.total || 0
    });

    const currentResult = processResult(currentData);
    const previousResult = processResult(previousData);
    const lastYearResult = processResult(lastYearData);

    // Calculate percentages
    const calculatePercentage = (current, previous) =>
      previous === 0 ? 0 : ((current - previous) / previous * 100).toFixed(2);

    // Get chart data
    const chartData = await getChartData(type, period, astrologer_id);

    // Build response
    const response = {
      success: true,
      data: {
        current: {
          total: currentResult.total
        },
        comparison: {
          previous_period: {
            total: previousResult.total,
            percentage: calculatePercentage(currentResult.total, previousResult.total)
          },
          last_year: {
            total: lastYearResult.total,
            percentage: calculatePercentage(currentResult.total, lastYearResult.total)
          }
        },
        chart: chartData
      }
    };

    res.json(response);

  } catch (error) {
    next(error);
  }
};

const getDayName = (date) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
};

// Modified getChartData function for this_week
async function getChartData(type, period, astrologerId) {
  const now = getCurrentIST();
  let groupFormat, dateField;

  switch (period) {
    case '7d':
    case '30d':
      groupFormat = '%Y-%m-%d';
      break;
    case '12m':
    case 'this_month':
    case 'ytd':
      groupFormat = '%Y-%m';
      break;
    case 'this_week':
      groupFormat = '%Y-%m-%d';
      break;
  }

  const Model = type === 'call' ? CallChatHistory : AstrologerWallet;
  dateField = type === 'call' ? 'created_at' : 'timestamp';

  const chartData = await Model.aggregate([
    { $match: { 
      astrologer_id: mongoose.Types.ObjectId(astrologerId),
      ...(type === 'earning' && { transaction_type: 'credit' })
    }},
    { $addFields: {
      date: {
        $dateToString: {
          format: groupFormat,
          date: `$${dateField}`,
          timezone: '+05:30'
        }
      }
    }},
    { $group: {
      _id: '$date',
      total: { $sum: type === 'call' ? 1 : '$amount' }
    }},
    { $sort: { _id: 1 } },
    { $project: {
      date: '$_id',
      total: 1,
      _id: 0
    }}
  ]);

  // For this_week, add day names
  if (period === 'this_week') {
    return chartData.map(entry => ({
      ...entry,
      day: getDayName(new Date(entry.date))
    }));
  }

  return chartData;
}

module.exports = { getAstroDashboard };