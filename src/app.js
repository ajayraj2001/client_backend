const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const appRoutes = require('./routes');

const app = express();

const allowedOrigins = process.env.CORS_ORIGINS.split(',');

const corsOptions = {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};


// const corsOptions = {
//     origin: '*', // Allow all origins
//     methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
//     allowedHeaders: ['Content-Type', 'Authorization'],
//     credentials: false // Set to false because credentials can't be used with origin '*'
// };


app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));
// app.use(cors());
app.use(cors(corsOptions));
app.use(morgan('dev'));

appRoutes(app);

module.exports = app;
