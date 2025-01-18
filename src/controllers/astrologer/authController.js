const { ApiError } = require('../../errorHandler');
const { Astrologer } = require('../../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const { ACCESS_TOKEN_SECRET } = process.env;

// Login Controller
const login = async (req, res, next) => {
    try {
        const { email, password, deviceId, deviceToken } = req.body;

        if (!email || !password) {
            throw new ApiError('Email and password are required', 400);
        }

        // Check if the astrologer exists and status is active
        const astrologer = await Astrologer.findOne({ email, status: 'Active' });
        if (!astrologer) {
            throw new ApiError('Astrologer not found or not active', 404);
        }

        // Check if the password matches (assuming password is hashed)
        const isPasswordValid = await bcrypt.compare(password, astrologer.password);
        if (!isPasswordValid) {
            throw new ApiError('Invalid password', 401);
        }

        // Update device information
        astrologer.deviceId = deviceId || astrologer.deviceId;
        astrologer.deviceToken = deviceToken || astrologer.deviceToken;
        await astrologer.save();

        // Generate JWT token
        const token = jwt.sign({ id: astrologer._id, number: astrologer.number }, ACCESS_TOKEN_SECRET, {
            expiresIn: '20d', // Token expires in 20 days
        });

        // Remove password from the response
        const astrologerResponse = astrologer.toObject();
        delete astrologerResponse.password;

        return res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            astrologer: astrologerResponse,
        });
    } catch (error) {
        next(error);
    }
};

// Signup Controller
const signup = async (req, res, next) => {
    try {
        const { name, number, email, password, about, experience, address, language, state, city } = req.body;

        if (!name || !number || !email || !password) {
            throw new ApiError('Name, number, email, and password are required', 400);
        }

        // Check if the astrologer already exists
        const existingAstrologer = await Astrologer.findOne({ $or: [{ number }, { email }] });
        if (existingAstrologer) {
            throw new ApiError('Astrologer with this number or email already exists', 400);
        }

        // Hash the password before saving
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new astrologer with status 'Inactive'
        const astrologer = new Astrologer({
            name,
            number,
            email,
            password: hashedPassword,
            about,
            experience,
            address,
            language,
            state,
            city,
            status: 'Inactive',
        });

        await astrologer.save();

        // Notify admin (you can implement this function to send a notification to the admin)
        notifyAdmin(astrologer);

        // Remove password from the response
        const astrologerResponse = astrologer.toObject();
        delete astrologerResponse.password;

        return res.status(201).json({
            success: true,
            message: 'Astrologer registered successfully. Waiting for admin approval.',
            astrologer: astrologerResponse,
        });
    } catch (error) {
        next(error);
    }
};

// Function to notify admin (you can implement this as per your requirements)
const notifyAdmin = (astrologer) => {
    // Implement your logic to notify the admin (e.g., send an email, push notification, etc.)
    console.log(`New astrologer registered: ${astrologer.name}. Waiting for approval.`);
};

module.exports = {
    login,
    signup,
};