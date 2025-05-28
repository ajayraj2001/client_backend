const axios = require('axios');

const getNumerology = async (req, res) => {
    try {
        const { name, date, lang = 'en' } = req.query;
        const apiKey = process.env.VEDIC_ASTRO_API_KEY;

        if (!name || !date) {
            return res.status(400).json({ message: 'Name and date of birth are required.' });
        }

        const apiUrl = `https://api.vedicastroapi.com/v3-json/prediction/numerology?name=${encodeURIComponent(
            name
        )}&date=${date}&api_key=${apiKey}&lang=${lang}`;

        const { data } = await axios.get(apiUrl);

        return res.status(200).json({
            status: 200,
            numerology: data.response,
        });
    } catch (error) {
        console.error('Numerology API Error:', error?.response?.data || error.message);
        return res.status(500).json({
            message: 'Failed to fetch numerology prediction',
            error: error?.response?.data || error.message,
        });
    }
};

module.exports = { getNumerology };
