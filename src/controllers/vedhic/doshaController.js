const apiClient = require('../../utils/appClient');

const BASE_URL = 'https://api.vedicastroapi.com/v3-json/dosha';

const endpoints = {
    mangal: 'mangal-dosh',
    kaalsarp: 'kaalsarp-dosh',
    manglik: 'manglik-dosh',
    pitra: 'pitra-dosh'
};

fetchAllDoshas = async ({ dob, tob, lat, lon, lang }) => {
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

fetchSingleDosha = async ({ type, dob, tob, lat, lon, lang }) => {
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


exports.getAllDoshas = async (req, res) => {
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

exports.getSingleDosha = async (req, res) => {
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


