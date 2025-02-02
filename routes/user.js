const express = require('express');
const { upload, handleUploadErrors } = require('../middleware/upload');
const { getDashboardData, createSector } = require('../controllers/sectorController');
const { getUploadAttempts, getAttemptImages } = require('../models/imageModel');
const { handleImageUpload } = require('../controllers/imageController');

const router = express.Router();

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
        console.error('Error creating sector:', error.message || error);
        res.status(500).json({ error: 'Failed to create sector' });
    }
});

router.get('/upload', ensureAuthenticated, (req, res) => {
    const sectorId = req.query.sectorId;
    res.render('pages/user/upload', { sectorId });
});

router.post('/upload/image', 
    ensureAuthenticated, 
    upload.array('images', 5), 
    handleImageUpload, 
    handleUploadErrors
);

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
        console.error('Error loading results:', error.message || error);
        res.status(500).send('Error loading results');
    }
});

router.use((err, req, res, next) => {
    console.error('Route Error:', err.message || err);
    
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size exceeds 5MB limit' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ error: 'Maximum 5 files allowed' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ error: 'Invalid file type' });
    }

    res.status(500).json({ 
        error: err.message || 'An unexpected error occurred' 
    });
});

module.exports = router;