const axios = require('axios');
const moment = require('moment-timezone'); // install with: npm install moment-timezone

const API_KEY = process.env.VEDIC_ASTRO_API_KEY; // Save your key in env
const BASE_URL = 'https://api.vedicastroapi.com/v3-json/panchang';

const getPanchang = async (req, res) => {
    try {
        const { date, time, lat, lon, tz = 5.5, lang = 'en' } = req.body;

        if (!date || !time || !lat || !lon) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }
        console.log('apikey',API_KEY )

        const url = `${BASE_URL}/panchang?api_key=${API_KEY}&date=${date}&tz=${tz}&lat=${lat}&lon=${lon}&time=${time}&lang=${lang}`;

        const response = await axios.get(url);
        res.status(200).json({ status: 200, data: response.data });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to fetch panchang data' });
    }
};

const getFestival = async (req, res) => {
    try {
        const { date, lat, lon, tz = 5.5, lang = 'en' } = req.body;

        if (!date || !lat || !lon || !tz) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }
  console.log('apikey',API_KEY )
        const url = `${BASE_URL}/festivals?api_key=${API_KEY}&date=${date}&tz=${tz}&lat=${lat}&lon=${lon}&lang=${lang}`;

        const response = await axios.get(url);
        res.status(200).json({ status: 200, data: response.data });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to fetch festival data' });
    }
};

// const getCombinedPanchangAndFestival = async (req, res) => {
//     try {
//         const { date, time, lat, lon, tz = 5.5, lang = 'en' } = req.body;

//         if (!date || !time || !lat || !lon) {
//             return res.status(400).json({ error: 'Missing required parameters' });
//         }

//         console.log('apikey', API_KEY);

//         const panchangURL = `${BASE_URL}/panchang?api_key=${API_KEY}&date=${date}&tz=${tz}&lat=${lat}&lon=${lon}&time=${time}&lang=${lang}`;
//         const festivalURL = `${BASE_URL}/festivals?api_key=${API_KEY}&date=${date}&tz=${tz}&lat=${lat}&lon=${lon}&lang=${lang}`;

//         const [panchangRes, festivalRes] = await Promise.all([
//             axios.get(panchangURL),
//             axios.get(festivalURL)
//         ]);

//         res.status(200).json({
//             status: 200,
//             message: "Combined Panchang and Festival Data",
//             panchang: panchangRes.data,
//             festivals: festivalRes.data
//         });
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).json({ error: 'Failed to fetch combined Panchang and Festival data' });
//     }
// };

const getPanchangOnly = async (req, res) => {
    try {
        const { lat,date, lon, tz = 5.5, lang = 'en' } = req.body;

        if (!lat || !lon) {
            return res.status(400).json({ error: 'Missing required parameters (lat, lon)' });
        }

        // Get current date and time in IST
        const now = moment().tz("Asia/Kolkata");
        const time = now.format("HH:mm");      // e.g. 14:30

        const panchangURL = `${BASE_URL}/panchang?api_key=${API_KEY}&date=${date}&tz=${tz}&lat=${lat}&lon=${lon}&time=${time}&lang=${lang}`;

        const panchangRes = await axios.get(panchangURL);

        console.log('panchangRes',panchangRes)
        res.status(200).json({
            status: 200,
            message: "Panchang Data",
            panchang: panchangRes.data
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to fetch Panchang data' });
    }
};


module.exports = { getPanchang, getFestival, getPanchangOnly }


