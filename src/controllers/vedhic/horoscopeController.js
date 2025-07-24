const axios = require('axios');

const getChartImages = async (req, res) => {
    try {
        const {
            dob,
            tob,
            lat,
            lon,
            tz,
            style = 'north',
            lang = 'en',
            font_size = 12,
            font_style = 'roboto',
            colorful_planets = 0,
            size = 300,
            stroke = 2,
            format = 'base64',
            year = new Date().getFullYear(),
            transit_date
        } = req.query;

        const apiKey = process.env.VEDIC_ASTRO_API_KEY;

        if (!dob || !tob || !lat || !lon || !tz) {
            return res.status(400).json({ message: 'Missing required query parameters.' });
        }

        const commonParams = `dob=${dob}&tob=${tob}&lat=${lat}&lon=${lon}&tz=${tz}&style=${style}&api_key=${apiKey}&lang=${lang}&font_size=${font_size}&font_style=${font_style}&colorful_planets=${colorful_planets}&size=${size}&stroke=${stroke}&format=${format}&year=${year}${transit_date ? `&transit_date=${transit_date}` : ''}`;

        const chartTypes = ['D1', 'D9'];

        const chartPromises = chartTypes.map(div =>
            axios.get(`https://api.vedicastroapi.com/v3-json/horoscope/chart-image?div=${div}&color=%23ff3366&${commonParams}`)
        );

        const [d1Res, d9Res] = await Promise.all(chartPromises);

        return res.status(200).json({
            status: 200,
            charts: {
                D1: d1Res.data.response.base64,
                D9: d9Res.data.response.base64,
            },
        });
    } catch (err) {
        console.error('Chart Image Error:', err?.response?.data || err.message);
        return res.status(500).json({
            message: 'Failed to fetch chart images',
            error: err?.response?.data || err.message,
        });
    }
};

module.exports = { getChartImages };
