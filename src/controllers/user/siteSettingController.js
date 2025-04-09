const { ApiError } = require('../../errorHandler');
const { UserSetting } = require('../../models');

const appStatusCheck = async (req, res) => {
    const { platform, version } = req.query;

    try {
        const settings = await UserSetting.findOne({}, {
            [`${platform}.current_version`]: 1,
            [`${platform}.mandatory_update`]: 1,
            [`${platform}.maintenance_status`]: 1,
            [`${platform}.maintenance_text`]: 1,
            [`${platform}.maintenance_image`]: 1,
            [`${platform}.download_url`]: 1
        });

        if (!settings) {
            return res.status(404).json({ success: false, message: "Settings not found" });
        }

        const platformSettings = settings[platform];
        if (!platformSettings) {
            return res.status(400).json({ success: false, message: "Invalid platform" });
        }

        const updateRequired = version !== platformSettings.current_version;

        return res.json({
            success: true,
            update: {
                updateRequired,
                mandatory: platformSettings.mandatory_update,
                latestVersion: platformSettings.current_version,
                downloadUrl: platformSettings.download_url,
            },
            maintenance: {
                status: platformSettings.maintenance_status,
                message: platformSettings.maintenance_text,
                image: platformSettings.maintenance_image,
            }
        });
    } catch (error) {
        console.error("Error fetching user app status:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

const settingsData = async (req, res) => {
    try {
        const settings = await UserSetting.findOne();
        if (!settings) {
            return res.status(404).json({ success: false, message: "Settings not found" });
        }

        return res.json({
            success: true,
            settings: settings.general,
            refer_amount: settings.refer_amount,
            sign_up_bonus: settings.sign_up_bonus,
            bonus_text: settings.bonus_text,
        });
    } catch (error) {
        console.error("Error fetching settings:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

module.exports = {
    appStatusCheck,
    settingsData
}
