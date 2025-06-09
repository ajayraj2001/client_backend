const apiClient = require('../../utils/appClient');
const axios = require('axios');

const BASE_URL = 'https://api.vedicastroapi.com/v3-json/dosha';

const endpoints = {
    mangal: 'mangal-dosh',
    kaalsarp: 'kaalsarp-dosh',
    manglik: 'manglik-dosh',
    pitra: 'pitra-dosh'
};

const fetchAllDoshas = async ({ dob, tob, lat, lon, lang }) => {
    const params = {
        dob,
        tob,
        lat,
        lon,
        tz: 5.5,
        lang,
        api_key: process.env.VEDIC_ASTRO_API_KEY
    };

    const queries = Object.entries(endpoints).map(async ([key, path]) => {
        const res = await apiClient.get(`${BASE_URL}/${path}`, params);
        return { [key]: res };
    });

    const results = await Promise.all(queries);
    return Object.assign({}, ...results);
};

const fetchSingleDosha = async ({ type, dob, tob, lat, lon, lang }) => {
    const endpoint = endpoints[type];
    if (!endpoint) throw new Error('Invalid dosha type');

    const params = {
        dob,
        tob,
        lat,
        lon,
        tz: 5.5,
        lang,
        api_key: process.env.VEDIC_ASTRO_API_KEY
    };

    const result = await apiClient.get(`${BASE_URL}/${endpoint}`, params);
    return result;
};

const getAllDoshas = async (req, res) => {
    try {
        const { dob, tob, lat, lon, lang = 'en' } = req.query;
        if (!dob || !tob || !lat || !lon) {
            return res.status(400).json({ error: 'Missing required query parameters' });
        }

        const data = await fetchAllDoshas({ dob, tob, lat, lon, lang });
        res.json({ status: 200, data });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Something went wrong' });
    }
};

const getSingleDosha = async (req, res) => {
    try {
        const { type, dob, tob, lat, lon, lang = 'en' } = req.body;
        const validTypes = ['mangal', 'kaalsarp', 'manglik', 'pitra'];

        if (!type || !validTypes.includes(type)) {
            return res.status(400).json({ error: 'Invalid or missing dosha type' });
        }
        if (!dob || !tob || !lat || !lon) {
            return res.status(400).json({ error: 'Missing required query parameters' });
        }

        const result = await fetchSingleDosha({ type, dob, tob, lat, lon, lang });
        res.json({ status: 200, type, result });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Something went wrong' });
    }
};

const getCombinedDoshas = async (req, res) => {
    try {
        const { dob, tob, lat, lon, tz, lang = 'en' } = req.query;
        const apiKey = process.env.VEDIC_ASTRO_API_KEY;

        if (!dob || !tob || !lat || !lon || !tz) {
            return res.status(400).json({ message: 'Missing required query parameters.' });
        }

        const baseURL = 'https://api.vedicastroapi.com/v3-json/dosha';
        const commonParams = `dob=${dob}&tob=${tob}&lat=${lat}&lon=${lon}&tz=${tz}&api_key=${apiKey}&lang=${lang}`;

        // Prepare all three API requests
        const mangalURL = `${baseURL}/mangal-dosh?${commonParams}`;
        const kaalsarpURL = `${baseURL}/kaalsarp-dosh?${commonParams}`;
        const pitraURL = `${baseURL}/pitra-dosh?${commonParams}`;

        // Parallel requests
        const [mangalRes, kaalsarpRes, pitraRes] = await Promise.all([
            axios.get(mangalURL),
            axios.get(kaalsarpURL),
            axios.get(pitraURL),
        ]);

        return res.status(200).json({
            status: 200,
            data: {
                mangalDosh: mangalRes.data.response,
                kaalsarpDosh: kaalsarpRes.data.response,
                pitraDosh: pitraRes.data.response,
            },
        });
    } catch (err) {
        console.error('Error fetching doshas:', err?.response?.data || err.message);
        return res.status(500).json({
            message: 'Failed to fetch dosha details',
            error: err?.response?.data || err.message,
        });
    }
};

module.exports = {
    getCombinedDoshas,
    getSingleDosha,
    getAllDoshas
};



