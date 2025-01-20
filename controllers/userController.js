const axios = require('axios');

const getTemperatureData = async (req) => {
    const { latitude, longitude } = req.session.user;

    if (!latitude || !longitude) {
        throw new Error('Location data not found in session.');
    }

    const weatherApiUrl = 'https://api.open-meteo.com/v1/forecast';
    const params = {
        latitude,
        longitude,
        daily: 'temperature_2m_max,temperature_2m_min',
        timezone: 'auto',
    };

    const response = await axios.get(weatherApiUrl, { params });

    if (response.status !== 200 || !response.data || !response.data.daily) {
        throw new Error(`Unexpected API response: ${response.status}`);
    }

    return response.data.daily.time.map((date, index) => ({
        date,
        temp_max: response.data.daily.temperature_2m_max[index],
        temp_min: response.data.daily.temperature_2m_min[index],
    }));
};

const getRainfallAndIrrigationData = async (req) => {
    const { latitude, longitude } = req.session.user;

    if (!latitude || !longitude) {
        throw new Error('Location data not found in session.');
    }

    const weatherApiUrl = 'https://api.open-meteo.com/v1/forecast';
    const params = {
        latitude,
        longitude,
        daily: 'precipitation_sum',
        timezone: 'auto',
    };

    const response = await axios.get(weatherApiUrl, { params });

    if (response.status !== 200 || !response.data || !response.data.daily) {
        throw new Error(`Unexpected API response: ${response.status}`);
    }

    return response.data.daily.time.map((date, index) => ({
        date,
        precipitation: response.data.daily.precipitation_sum[index],
        irrigationNeeded: response.data.daily.precipitation_sum[index] < 5,
    }));
};

module.exports = { getTemperatureData, getRainfallAndIrrigationData };
