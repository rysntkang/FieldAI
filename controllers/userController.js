const axios = require('axios');
const { getSectorsByUserId, addSector } = require('../models/sectorModel');

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

const getDashboardData = async (req) => {
    const userId = req.session.user.user_id;
    const temperatureData = await getTemperatureData(req);
    const sectors = await getSectorsByUserId(userId);

    return { temperatureData, sectors };
};

const createSector = async (req) => {
    const userId = req.session.user.user_id;
    const { sectorName, latitude, longitude } = req.body;

    if (!sectorName || !latitude || !longitude) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    const newSectorId = await addSector(userId, sectorName, latitude, longitude);
    return { sector_id: newSectorId, name: sectorName, latitude, longitude };
};

module.exports = { getDashboardData, createSector, getTemperatureData };
