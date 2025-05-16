const express = require("express");
const vedhicRoute = express.Router();
const doshaRoutes = require('./vedhicRoutes/doshaRoute');
const dashaRoutes = require('./vedhicRoutes/dashaRoute');
const extendedHoroscopeRoutes = require('./vedhicRoutes/extendedHoroscopeRoute');

vedhicRoute.use("/dosha", doshaRoutes);
vedhicRoute.use("/dasha", dashaRoutes);
vedhicRoute.use("/extendedHoroscope", extendedHoroscopeRoutes);

module.exports = vedhicRoute;