const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Common settings schema for both User and Astro
const CommonSettingsSchema = new Schema({
  contact_us: { type: String, default: "" },
  terms_and_conditions: { type: String, default: "" },
  cancellation_refund_policy: { type: String, default: "" },
  privacy_policy: { type: String, default: "" },
  about_us: { type: String, default: "" }
});

// Platform-specific settings schema
const PlatformSettingsSchema = new Schema({
  current_version: { type: String, required: true }, // e.g., "1.0.0"
  mandatory_update: { type: Boolean, default: false },
  maintenance_status: { type: Boolean, default: false },
  maintenance_image: { type: String, default: "" },
  maintenance_text: { type: String, default: "" },
  download_url: { type: String, default: "" }, // Link to Play Store / App Store
});

// User-specific settings
const UserSettingSchema = new Schema({
  general: CommonSettingsSchema,
  android: PlatformSettingsSchema,
  ios: PlatformSettingsSchema,
  refer_amount: { type: Number, default: 0 },
  sign_up_bonus: { type: Number, default: 0 },
  bonus_text: { type: String, default: "" },
  created_at:  { type: Date, default: () => new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000) }, // IST
});

// Astro-specific settings
const AstroSettingSchema = new Schema({
  general: CommonSettingsSchema,
  android: PlatformSettingsSchema,
  ios: PlatformSettingsSchema,
  created_at:  { type: Date, default: () => new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000) }, // IST
});

module.exports = {
  UserSetting: mongoose.model('UserSetting', UserSettingSchema),
  AstroSetting: mongoose.model('AstroSetting', AstroSettingSchema),
};
