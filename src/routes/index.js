const express = require('express');
const unspecifiedRoutesHandler = require('./unspecified.route');
const { finalErrorHandler } = require('../errorHandler');
const apiRoute = require('./api.route');
const axios = require('axios')

const appRoutes = (app) => {
  
  app.get('/api/ping', (_, res) => res.status(200).json({ success: true, message: 'Ping Successfully.', timestamp: new Date() }));
  app.use('/public', express.static('public'));
  app.use('/api', apiRoute);
  app.use(unspecifiedRoutesHandler);
  app.use(finalErrorHandler);
};

module.exports = appRoutes;

// app.use('/images', express.static('public/images'));
// app.use('/images', express.static('images'));
