const express = require("express");
const vedhicRoute = express.Router();
const doshaRoutes = require('./vedhicRoutes/doshaRoute');
const dashaRoutes = require('./vedhicRoutes/dashaRoute');
const extendedHoroscopeRoutes = require('./vedhicRoutes/extendedHoroscopeRoute');
const horoscopeRoutes = require('./vedhicRoutes/horoscopeRoute');
const predictionRoutes = require('./vedhicRoutes/predictionRoute');
const panchnangRoutes = require('./vedhicRoutes/panchangRoute.js');

vedhicRoute.use("/dosha", doshaRoutes);
vedhicRoute.use("/dasha", dashaRoutes);
vedhicRoute.use("/extendedHoroscope", extendedHoroscopeRoutes);
vedhicRoute.use("/horoscope", horoscopeRoutes);
vedhicRoute.use("/prediction", predictionRoutes);
vedhicRoute.use("/panchang", panchnangRoutes);

module.exports = vedhicRoute;