const axios = require('axios');
const bcryptjs = require('bcryptjs');
const { findUserByEmail, findUserByUsername, updateUser, deleteUser } = require('../models/userModel');
const { getSectorsByUserId } = require('../models/sectorModel');

const getWeatherData = async (req) => {
  const query = req.query || {};
  
  const latitude = query.lat ? parseFloat(query.lat) : req.session.user.latitude;
  const longitude = query.lng ? parseFloat(query.lng) : req.session.user.longitude;
  
  const weatherApiUrl = 'https://api.open-meteo.com/v1/forecast';
  const params = {
    latitude,
    longitude,
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max',
    hourly: 'soil_moisture_0_1cm',
    timezone: 'auto',
  };

  const response = await axios.get(weatherApiUrl, { params });

  let gdd_accumulated = 0;
  const dailyData = response.data.daily.time.map((date, index) => {
    const temp_max = response.data.daily.temperature_2m_max[index];
    const temp_min = response.data.daily.temperature_2m_min[index];
    const gdd = Math.max((temp_max + temp_min) / 2 - 10, 0);
    gdd_accumulated += gdd;
    return {
      date,
      temp_max,
      temp_min,
      precipitation: response.data.daily.precipitation_sum[index],
      wind_speed: response.data.daily.wind_speed_10m_max[index],
      gdd_accumulated,
      soil_moisture: response.data.hourly.soil_moisture_0_1cm[index * 24]
    };
  });
  return dailyData;
};

const getDashboardData = async (req) => {
    const userId = req.session.user.user_id;
    const weatherData = await getWeatherData(req);
    const sectors = await getSectorsByUserId(userId);
    return { weatherData, sectors };
};

const updateUserSettings = async (req, res) => {
  const { email, username, password, confirmPassword, latitude, longitude } = req.body;
  const userId = req.session.user.user_id;

  if (!email || !username || !latitude || !longitude) {
    return res.redirect('/user/settings?error=All fields are required');
  }

  if (!latitude || !longitude) {
    return res.redirect(
      '/user/settings?error=' + encodeURIComponent('Location missing. Please ensure location is enabled by refreshing.')
    );
  }

  if (username.trim().length < 5) {
    return res.redirect(
      '/user/settings?error=' + encodeURIComponent('Username must be at least 5 characters long.')
    );
  }

  if (password.length < 6) {
    return res.redirect(
      '/user/settings?error=' + encodeURIComponent('Password must be at least 6 characters long.')
    );
  }

  const latNum = parseFloat(latitude);
  const lngNum = parseFloat(longitude);
  if (isNaN(latNum) || isNaN(lngNum)) {
    return res.redirect('/user/settings?error=Invalid farm location coordinates');
  }

  if (password !== confirmPassword) {
    return res.redirect('/user/settings?error=Passwords do not match');
  }

  const currentUser = req.session.user;
  if (
    email === currentUser.email &&
    username === currentUser.username &&
    latNum === parseFloat(currentUser.latitude) &&
    lngNum === parseFloat(currentUser.longitude) &&
    (!password || password.trim() === "")
  ) {
    return res.redirect('/user/settings?error=No changes detected. Please update at least one field.');
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
      latitude: latNum,
      longitude: lngNum
    };

    if (password && password.trim() !== "") {
      updates.password = await bcryptjs.hash(password, 10);
    }

    const success = await updateUser(userId, updates);
    if (!success) {
      return res.redirect('/user/settings?error=Error updating user in database');
    }

    const { password: pwd, ...sessionUpdates } = updates;
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
    return res.redirect('/user/settings?error=An unexpected error occurred. Please try again.');
  }
};

const deleteAccount = async (req, res) => {
  const userId = req.session.user.user_id;
  try {
    await deleteUser(userId);
    // Destroy the session after deletion:
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session after account deletion:', err);
        return res.redirect('/user/settings?error=An error occurred while deleting your account.');
      }
      // Optionally, you might clear a cookie here if needed.
      res.redirect('/login?success=Account deleted successfully.');
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    return res.redirect('/user/settings?error=Error deleting account');
  }
};


module.exports = { getDashboardData, updateUserSettings, getWeatherData, deleteAccount };