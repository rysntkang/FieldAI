const express = require('express');
const { upload, handleUploadErrors } = require('../middleware/upload');
const { getDashboardData, createSector } = require('../controllers/sectorController');
const { getUploadAttempts, getAttemptImages, createUploadAttemptWithImages, saveImageRecords } = require('../models/imageModel');
const { handleImageUpload } = require('../controllers/imageController');

const router = express.Router();

const ensureAuthenticated = (req, res, next) => {
    if (req.session?.user) return next();
    res.redirect('/login');
};

router.get('/user/dashboard', ensureAuthenticated, async (req, res) => {
    try {
        const { temperatureData, sectors } = await getDashboardData(req);
        res.render('pages/user/dashboard', {
            user: req.session.user,
            temperatureData,
            sectors
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
        
        for (const attempt of attempts) {
            attempt.images = await getAttemptImages(attempt.upload_id);
        }

        res.render('partials/user/modals/resultContent', {
            attempts,
            sectorId
        });
    } catch (error) {
        console.error('Results error:', error);
        if (!res.headersSent) {
            res.status(500).send('Error loading results');
        }
    }
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

router.use((err, req, res, next) => {
    console.error('Route Error:', err);
    
    if (res.headersSent) return next(err);

    const errors = {
        LIMIT_FILE_SIZE: 'File size exceeds 5MB limit',
        LIMIT_FILE_COUNT: 'Maximum 10 files allowed',
        LIMIT_UNEXPECTED_FILE: 'Invalid file type'
    };

    res.status(err.status || 500).json({
        error: errors[err.code] || err.message || 'Unexpected error occurred'
    });
});

module.exports = router;