const { ApiError } = require('../../errorHandler');
const { Astrologer, BankAccountRequest } = require('../../models');

// Request to add a bank account
const requestAddBankAccount = async (req, res, next) => {
    try {
        const { account_type, account_holder_name, account_no, bank, ifsc } = req.body;

        // Validate required fields
        if (!account_type || !account_holder_name || !account_no || !bank || !ifsc) {
            throw new ApiError('All fields are required', 400);
        }

        // Get the authenticated astrologer's ID from the middleware
        const astrologer_id = req.astrologer._id;

        // Check if the astrologer has any pending requests
        const pendingRequest = await BankAccountRequest.findOne({ astrologer_id, status: 'Pending' });
        if (pendingRequest) {
            throw new ApiError('You already have a pending bank account request', 400);
        }

        // Create a new bank account request
        const bankAccountRequest = new BankAccountRequest({
            astrologer_id,
            account_type,
            account_holder_name,
            account_no,
            bank,
            ifsc,
        });

        await bankAccountRequest.save();

        return res.status(201).json({
            success: true,
            message: 'Bank account request submitted successfully. Waiting for admin approval.',
            bankAccountRequest,
        });
    } catch (error) {
        next(error);
    }
};

// Cancel a bank account request
const cancelBankAccountRequest = async (req, res, next) => {
    try {
        const { request_id } = req.body;

        if (!request_id) {
            throw new ApiError('Request ID is required', 400);
        }

        // Find and delete the request by its ID
        const deletedRequest = await BankAccountRequest.findByIdAndDelete(request_id);

        if (!deletedRequest) {
            throw new ApiError('Bank account request not found or you are not authorized to cancel it', 404);
        }

        return res.status(200).json({
            success: true,
            message: 'Bank account request cancelled successfully',
            deletedRequest,
        });
    } catch (error) {
        next(error);
    }
};  

module.exports = {
    requestAddBankAccount,
    cancelBankAccountRequest,
};