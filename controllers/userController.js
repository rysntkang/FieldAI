const axios = require('axios');

const getTemperatureData = async (req, res) => {
    const { latitude, longitude } = req.session.user;

    if (!latitude || !longitude) {
        throw new Error('Location data not found in session.');
    }

    try {
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

        // Extract daily temperature data
        return response.data.daily.time.map((date, index) => ({
            date,
            temp_max: response.data.daily.temperature_2m_max[index],
            temp_min: response.data.daily.temperature_2m_min[index],
        }));
    } catch (error) {
        console.error('Error fetching temperature data:', error.message || error);
        throw new Error('An error occurred while fetching temperature data.');
    }
};

module.exports = { getTemperatureData };
