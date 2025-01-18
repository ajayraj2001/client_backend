const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { getCurrentIST } = require('../utils/timeUtils'); 

const bankAccountRequestSchema = new Schema({
    astrologer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Astrologer', required: true },
    account_type: { type: String, required: true },
    account_holder_name: { type: String, required: true },
    account_no: { type: String, required: true },
    bank: { type: String, required: true },
    ifsc: { type: String, required: true },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' }
},{
    timestamps: { 
      createdAt: 'created_at', 
      updatedAt: 'updated_at', 
      currentTime: getCurrentIST, // Use IST for timestamps
    }
  });

const BankAccountRequest = mongoose.model('BankAccountRequest', bankAccountRequestSchema);

module.exports = BankAccountRequest;