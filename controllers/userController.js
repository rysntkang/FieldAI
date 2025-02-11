const axios = require('axios');
const bcryptjs = require('bcryptjs');
const { findUserByEmail, findUserByUsername, updateUser } = require('../models/userModel');
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
    const gdd = Math.max((temp_max + temp_min) / 2 - 10, 0); // Base temp 10°C for corn
    gdd_accumulated += gdd;
    return {
      date,
      temp_max,
      temp_min,
      precipitation: response.data.daily.precipitation_sum[index],
      wind_speed: response.data.daily.wind_speed_10m_max[index],
      gdd_accumulated,
      soil_moisture: response.data.hourly.soil_moisture_0_1cm[index * 24] // daily sample
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

  // 1. Check for missing required fields
  if (!email || !username || !latitude || !longitude) {
    return res.redirect('/user/settings?error=All fields are required');
  }

  // 2. Validate that latitude and longitude are valid numbers
  const latNum = parseFloat(latitude);
  const lngNum = parseFloat(longitude);
  if (isNaN(latNum) || isNaN(lngNum)) {
    return res.redirect('/user/settings?error=Invalid farm location coordinates');
  }

  // 3. If a new password is provided, check that it matches confirmPassword
  if (password !== confirmPassword) {
    return res.redirect('/user/settings?error=Passwords do not match');
  }

  // 4. Check if any fields have been changed by comparing with the session data.
  //    We ignore the password if it's left blank (i.e., user doesn't intend to change it).
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
    // 5. Check if email is already in use by another user
    const existingEmail = await findUserByEmail(email);
    if (existingEmail && existingEmail.user_id !== userId) {
      return res.redirect('/user/settings?error=Email already in use');
    }

    // 6. Check if username is already taken by another user
    const existingUsername = await findUserByUsername(username);
    if (existingUsername && existingUsername.user_id !== userId) {
      return res.redirect('/user/settings?error=Username already taken');
    }

    // 7. Build the updates object for the database
    const updates = {
      email,
      username,
      latitude: latNum,
      longitude: lngNum
    };

    // 8. Hash the new password if one is provided
    if (password && password.trim() !== "") {
      updates.password = await bcryptjs.hash(password, 10);
    }

    // 9. Attempt to update the user in the database
    const success = await updateUser(userId, updates);
    if (!success) {
      return res.redirect('/user/settings?error=Error updating user in database');
    }

    // 10. Update the session user object (excluding the password)
    const { password: pwd, ...sessionUpdates } = updates;
    req.session.user = { ...req.session.user, ...sessionUpdates };

    // 11. Save the session and check for errors during save
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.redirect('/user/settings?error=Error updating session');
      }
      res.redirect('/user/settings?success=Settings updated successfully');
    });
    
  } catch (error) {
    // 12. Catch any other unexpected errors
    console.error('Update error:', error);
    return res.redirect('/user/settings?error=An unexpected error occurred. Please try again.');
  }
};




module.exports = { getDashboardData, updateUserSettings, getWeatherData };