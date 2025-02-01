const mongoose = require('mongoose');
const { getCurrentIST } = require('../utils/timeUtils');

const astrologerSignupRequestSchema = new mongoose.Schema({
  name: { type: String, required: true },
  number: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  about: { type: String, default: '' },
  experience: { type: Number, default: 0 },
  address: { type: String, default: '' },
  languages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Language' }],
  skills: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Skill' }],
  state: { type: String, default: '' },
  dob: { type: Date, default: null },
  gender: { type: String, default: '' },
  city: { type: String, default: '' },
  contact_no2: { type: String, default: '' },
  pincode: { type: String, default: '' },
  gst: { type: String, default: '' },
  pan_card: { type: String, default: '' },
  aadhar_card_no: { type: String, default: '' },
  profile_img: { type: String, default: '' },
  aadhar_card_img: { type: String, default: '' },
  pan_card_img: { type: String, default: '' },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  
  reapply: { type: Boolean, default: false }, // Indicates if this is a reapplication
  rejectionReason: { type: String, default: '' }, // Stores the reason for rejection
  previousRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'AstrologerSignupRequest' }, 
  created_at: { type: Date, default: getCurrentIST },
  updated_at: { type: Date, default: getCurrentIST },
});

astrologerSignupRequestSchema.index({ number: 1 });

module.exports = mongoose.model('AstrologerSignupRequest', astrologerSignupRequestSchema);