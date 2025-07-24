const adminRoute = require('./admin.route');
const userRoute = require('./user.route');
const astrologerRoute = require('./astrologer.route');
const vedhicRoute = require('./vedhic.route');

const apiRoute = require('express').Router();

apiRoute.use('/admin', adminRoute);
apiRoute.use('/user', userRoute);
apiRoute.use('/astrologer', astrologerRoute);
apiRoute.use('/astrology', vedhicRoute);

module.exports = apiRoute;
