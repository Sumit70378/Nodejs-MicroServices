const generateTokens = require('../utils/generateToken');
const logger = require('../utils/logger');
const { validateRegistration, validatelogin } = require('../utils/validation');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');

const registerUser = async (req, res) => {
    logger.info('Registration endpoint hit ...');

    try {
        // ✅ Validate the schema
        const { error } = validateRegistration(req.body);
        if (error) {
            logger.warn(`Validation error: ${error.details[0].message}`);
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            });
        }

        const { email, password, username } = req.body;

        // ✅ Check if user already exists
        let user = await User.findOne({ $or: [{ email }, { username }] });
        if (user) {
            logger.warn("User already exists");
            return res.status(400).json({
                success: false,
                message: "User already exists"
            });
        }

        // ✅ Create and save new user
        user = new User({ username, email, password });
        await user.save();
        logger.info(`✅ User saved successfully: ${user._id}`);

        // ✅ Generate tokens
        const { accessToken, refreshToken } = await generateTokens(user);
        logger.info("✅ Tokens generated successfully");

        return res.status(201).json({
            success: true,
            message: 'User registered successfully',
            accessToken,
            refreshToken
        });

    } catch (error) {
        logger.error(`❌ Registration error occurred: ${error.message}`, error.stack);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message // (Optional) For debugging in dev
        });
    }
};


//user login
const loginUser = async (req, res) => {
    logger.info('Login endpoint hit ...');
    try {

        const { error } = validatelogin(req.body)
        if (error) {
            logger.warn(`Validation error: ${error.details[0].message}`);
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            });
        }

        const { email, password } = req.body
        const user = await User.findOne({ email });

        if (!user) {
            logger.warn('Invalid user')
            return res.status(400).json({
                success: false,
                message: 'Invalid credentials'
            })
        }

        //valida password or not
        const isValidPass = await user.comparePassword(password)
        if (!isValidPass) {
            logger.warn('Invalid Password')
            return res.status(400).json({
                success: false,
                message: 'Invalid Password'
            })
        }

        const { accessToken, refreshToken } = await generateTokens(user);
        res.json({
            accessToken,
            refreshToken,
            userId: user._id
        })


    } catch (error) {
        logger.error(`❌ Registration error occurred: ${error.message}`, error.stack);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}

//refresh token
const refreshTokenUser = async (req, res) => {
    logger.info('Refresh token endpoint hit ...');
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            logger.warn('Refresh token missing');
            return res.status(400).json({
                success: false,
                message: "Refresh token is missing",
            });
        }

        const storedToken = await RefreshToken.findOne({ token: refreshToken });
        if (!storedToken || storedToken.expiresAt < new Date()) {
            logger.warn('Invalid or expired refresh token');
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired refresh token'
            });
        }

        const user = await User.findById(storedToken.user);
        if (!user) {
            logger.warn('User not found');
            return res.status(400).json({
                success: false,
                message: "User not found",
            });
        }

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await generateTokens(user);

        // Delete the old refresh token
        await RefreshToken.deleteOne({ _id: storedToken._id });

        return res.json({
            success: true,
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        });

    } catch (error) {
        logger.error(`❌ RefreshToken error occurred: ${error.message}`, error.stack);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

//logout

const logoutUser = async(req,res) => {
    logger.info('logoutUser endpoint hit ...');

    try {
        const {refreshToken} = req.body
         if (!refreshToken) {
            logger.warn('Refresh token missing');
            return res.status(400).json({
                success: false,
                message: "Refresh token is missing",
            });
        }
        
        await RefreshToken.deleteOne({token: refreshToken})
        logger.info('Refresh Token Deleted For Logout')
        return res.status(200).json({
                success: true,
                message: "Logout Successfully",
            });


    } catch (error) {
        logger.error(`❌ Logout error occurred: ${error.message}`, error.stack);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }

}
module.exports = { registerUser, loginUser , refreshTokenUser , logoutUser};
