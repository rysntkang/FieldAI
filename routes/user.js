const express = require('express');
const { upload, handleUploadErrors } = require('../middleware/upload');
const { createSector } = require('../controllers/sectorController');
const { handleImageUpload, getUploadAttempts } = require('../controllers/imageController');
const { getDashboardData, updateUserSettings, getWeatherData } = require('../controllers/userController');

const router = express.Router();

const ensureAuthenticated = (req, res, next) => {
  if (req.session?.user) return next();
  res.redirect('/login');
};

router.get('/user/dashboard', ensureAuthenticated, async (req, res) => {
  try {
    const { weatherData, sectors } = await getDashboardData(req);
    res.render('pages/user/dashboard', {
      user: req.session.user,
      weatherData,
      sectors,
      activePage: 'dashboard'
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.redirect('/user/dashboard');
  }
});

router.get('/results/:sectorId', ensureAuthenticated, async (req, res) => {
  try {
    const sectorId = req.params.sectorId;
    const attempts = await getUploadAttempts(sectorId);
    res.render('partials/user/modals/resultContent', {
      attempts,
      sectorId
    });
  } catch (error) {
    console.error('Results error:', error);
    res.status(500).send('Error loading results');
  }
});

router.get('/user/settings', ensureAuthenticated, (req, res) => {
  res.render('pages/user/settings', { 
    user: req.session.user,
    successMessage: req.query.success,
    errorMessage: req.query.error,
    activePage: 'settings'
  });
});

router.get('/user/tutorial', ensureAuthenticated, (req, res) => {
  res.render('pages/user/tutorial', {
    user: req.session.user,
    activePage: 'tutorial'
  });
});

router.post('/user/addSector', ensureAuthenticated, (req, res) => {
  createSector(req, res);
});

router.get('/upload', ensureAuthenticated, (req, res) => {
  try {
    const sectorId = req.query.sectorId;
    res.render('pages/user/upload', { sectorId });
  } catch (error) {
    console.error('Upload page error:', error);
    if (!res.headersSent) {
      res.redirect('/user/dashboard');
    }
  }
});

router.post('/upload/image', 
  ensureAuthenticated, 
  upload.array('images', 10), 
  handleUploadErrors, 
  handleImageUpload
);

router.post('/user/settings', ensureAuthenticated, updateUserSettings);

router.get('/user/weather', ensureAuthenticated, async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Missing latitude or longitude' });
    }
    
    const weatherData = await getWeatherData({ session: { user: { latitude: parseFloat(lat), longitude: parseFloat(lng) } } });
    res.json(weatherData);
  } catch (error) {
    console.error('Error fetching weather data:', error);
    res.status(500).json({ error: 'Error fetching weather data' });
  }
});

module.exports = router;