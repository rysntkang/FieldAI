const axios = require('axios');
const bcryptjs = require('bcryptjs');
const { findUserByEmail, findUserByUsername, updateUser } = require('../models/userModel');
const { getSectorsByUserId } = require('../models/sectorModel');

const getTemperatureData = async (req) => {
    const { latitude, longitude } = req.session.user;

    if (!latitude || !longitude) {
        throw new Error('Location data not found in session.');
    }

    const weatherApiUrl = 'https://api.open-meteo.com/v1/forecast';
    const params = {
        latitude,
        longitude,
        daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max', // Added precipitation and wind
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
        precipitation: response.data.daily.precipitation_sum[index], // Added precipitation data
        wind_speed: response.data.daily.wind_speed_10m_max[index], // Added wind speed data
    }));
};

const getDashboardData = async (req) => {
  const userId = req.session.user.user_id;
  const temperatureData = await getTemperatureData(req);
  const sectors = await getSectorsByUserId(userId);

  return { temperatureData, sectors };
};

const updateUserSettings = async (req, res) => {
    const { email, username, password, confirmPassword, latitude, longitude } = req.body;
    const userId = req.session.user.user_id;

    if (!email || !username || !latitude || !longitude) {
        return res.redirect('/user/settings?error=All fields are required');
    }

    if (password !== confirmPassword) {
        return res.redirect('/user/settings?error=Passwords do not match');
    }

    try {
        const existingEmail = await findUserByEmail(email);
        if (existingEmail && existingEmail.user_id !== userId) {
            return res.redirect('/user/settings?error=Email already in use');
        }

        const existingUsername = await findUserByUsername(username);
        if (existingUsername && existingUsername.user_id !== userId) {
            return res.redirect('/user/settings?error=Username already taken');
        }

        const updates = {
            email,
            username,
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude)
        };

        if (password) {
            updates.password = await bcryptjs.hash(password, 10);
        }

        const updated = await updateUser(userId, updates);
        if (!updated) {
            return res.redirect('/user/settings?error=Failed to update user');
        }

        const { password: _, ...sessionUpdates } = updates;
        req.session.user = { ...req.session.user, ...sessionUpdates };
        
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.redirect('/user/settings?error=Error updating session');
            }
            res.redirect('/user/settings?success=Settings updated successfully');
        });

    } catch (error) {
        console.error('Update error:', error);
        res.redirect('/user/settings?error=Error updating user');
    }
};

module.exports = { getDashboardData , updateUserSettings };
