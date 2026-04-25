const axios = require("axios");

async function getPrediction(features) {
  const response = await axios.post("http://127.0.0.1:5000/predict", features);
  return response.data;
}

module.exports = { getPrediction };