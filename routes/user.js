const express = require('express');
const { upload, handleUploadErrors } = require('../middleware/upload');
const { createSector, editSector, deleteSector } = require('../controllers/sectorController');
const { handleImageUpload, getUploadAttempts, deleteUploadAttemptController } = require('../controllers/imageController');
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
      activePage: 'dashboard',
      successMessage: req.query.success,
      errorMessage: req.query.error
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

    if (process.env.INSTANCE_UNIX_SOCKET){
      const getSignedUrl = require('../middleware/gcsimage');
      for (const attempt of attempts) {
        attempt.images = await Promise.all(
          attempt.images.map(async (image) => ({
            ...image,
            file_path: await getSignedUrl(image.file_path), // Replace file_path with signed URL
          }))
        );
      }
    }
    
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

router.post('/user/editSector', ensureAuthenticated, editSector);

router.delete('/user/deleteSector/:sectorId', ensureAuthenticated, async (req, res) => {
  try {
    await deleteSector(req, res);
  } catch (error) {
    console.error('Delete sector error:', error);
    res.status(500).json({ message: 'Error deleting sector.' });
  }
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

router.delete('/user/deleteAttempt/:uploadId', ensureAuthenticated, deleteUploadAttemptController);

router.post('/upload/image', 
  ensureAuthenticated, 
  upload.array('images', 10), 
  handleUploadErrors, 
  handleImageUpload
);

router.post('/user/settings', ensureAuthenticated, updateUserSettings);

router.get('/user/weather', ensureAuthenticated, async (req, res) => {
  try {
    const weatherData = await getWeatherData(req);
    res.json(weatherData);
  } catch (error) {
    console.error('Error fetching weather data:', error);
    res.status(500).json({ error: 'Error fetching weather data' });
  }
});

module.exports = router;