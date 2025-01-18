const { default: axios } = require("axios");

const fmpApi = axios.create({
  method: "GET",
  baseURL: "https://financialmodelingprep.com",
});

fmpApi.interceptors.request.use(
  (request) => {
    request.url.searchParams.set("apikey", process.env.STOCK_API_KEY);
    return request;
  },
  (error) => Promise.reject(error)
);

module.exports = { fmpApi };
