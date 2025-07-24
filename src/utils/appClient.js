const axios = require('axios');

const apiClient = {
    get: async (url, params = {}) => {
        try {
            const response = await axios.get(url, { params });
            if (response.data?.status === 200) {
                return response.data.response;
            } else {
                console.error(`API Error at ${url}:`, response.data);
                return null;
            }
        } catch (error) {
            console.error(`HTTP GET Error at ${url}:`, error.message);
            throw error;
        }
    }
};

module.exports = apiClient;
