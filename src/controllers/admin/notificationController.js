const { User, Notification, SentNotificationHistory } = require('../../models');
const { sendPushNotification } = require('../../utils/sendNotification');

/**
 * Admin creates notification (when adding Puja or Panchang)
 */
const sendNotificationToAllUsers = async (req, res, next) => {
    try {
        const { title, body, type, type_ref_id, image } = req.body;
        const adminId = req.admin?._id;

        if (!title || !body || !type) {
            return res.status(400).json({ success: false, message: 'Missing fields' });
        }

        const users = await User.find({ deviceToken: { $ne: '' }, status: 'Active' }).select('_id deviceToken');

        const deviceTokens = users.map(u => u.deviceToken);

        // Push notification to Firebase
        await sendPushNotification(deviceTokens, {
            title,
            body,
            image
        });

        // Save each as in-app notification
        const notifications = users.map(user => ({
            title,
            body,
            image,
            type,
            type_ref_id,
            user_id: user._id
        }));

        await Notification.insertMany(notifications);

        // Save history
        await NotificationHistory.create({
            title,
            body,
            image,
            type,
            type_ref_id,
            admin_id: adminId
        });

        return res.status(200).json({ success: true, message: 'Notification sent to all users' });
    } catch (error) {
        next(error);
    }
};

const getAdminNotificationHistory = async (req, res, next) => {
    try {
        const adminId = req.admin._id; // from adminAuth middleware

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Fetch only notifications created by this admin, paginated
        const [notifications, total] = await Promise.all([
            SentNotificationHistory.find({ admin_id: adminId })
                .sort({ created_at: -1 })
                .skip(skip)
                .limit(limit),

            SentNotificationHistory.countDocuments({ admin_id: adminId })
        ]);

        res.status(200).json({
            success: true,
            data: notifications,
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

module.exports = { sendNotificationToAllUsers, getAdminNotificationHistory }
