const express = require('express');
const upload = require('../middleware/upload');
const { getDashboardData, createSector } = require('../controllers/sectorController');
const { getUploadAttempts, getAttemptImages } = require('../models/imageModel');
const router = express.Router();

const { handleImageUpload } = require('../controllers/imageController');

const ensureAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }
    return res.redirect('/login');
};

router.get('/user/dashboard', ensureAuthenticated, async (req, res) => {
    try {
        const { temperatureData, sectors } = await getDashboardData(req);

        res.render('pages/user/dashboard', {
            user: req.session.user,
            temperatureData,
            sectors,
        });
    } catch (error) {
        console.error('Error rendering dashboard:', error.message || error);
        res.status(500).send('An error occurred while loading the dashboard.');
    }
});

router.post('/user/addSector', ensureAuthenticated, async (req, res) => {
    try {
        await createSector(req, res);
        res.redirect('/user/dashboard');
    } catch (error) {
        console.error('Error rendering dashboard:', error.message || error);
        res.status(500).send('An error occurred while loading the dashboard.');
    }
    }
);

router.get('/upload', (req, res) => {
    const sectorId = req.query.sectorId;
    res.render('pages/user/upload', { sectorId });
});

router.post('/upload/image', ensureAuthenticated, upload.array('images', 5), handleImageUpload);

router.get('/results/:sectorId', ensureAuthenticated, async (req, res) => {
  try {
    const sectorId = req.params.sectorId;
    const attempts = await getUploadAttempts(sectorId);
    
    for (const attempt of attempts) {
      attempt.images = await getAttemptImages(attempt.upload_id);
    }

    res.render('partials/user/modals/resultContent', {
      attempts,
      sectorId
    });
  } catch (error) {
    res.status(500).send('Error loading results');
  }
});
    
module.exports = router;