const { Notification, Puja } = require('../../models');

const getUserNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Fetch notifications for the user with pagination
    const [notifications, total] = await Promise.all([
      Notification.find({ user_id: userId })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit),

      Notification.countDocuments({ user_id: userId })
    ]);

    // Enrich each notification with Puja image if applicable
    const enrichedNotifications = await Promise.all(
      notifications.map(async (noti) => {
        let image = noti.image;

        if (noti.type === 'Puja' && noti.type_ref_id) {
          const puja = await Puja.findById(noti.type_ref_id).select('pujaImage');
          if (puja?.pujaImage) {
            image = puja.pujaImage;
          }
        }

        return {
          _id: noti._id,
          title: noti.title,
          body: noti.body,
          type: noti.type,
          is_read: noti.is_read,
          created_at: noti.created_at,
          image // Always from Puja
        };
      })
    );

    res.status(200).json({
      success: true,
      data: enrichedNotifications,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getUserNotifications };
