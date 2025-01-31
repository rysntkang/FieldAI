const express = require('express');
const { getDashboardData, createSector } = require('../controllers/sectorController');
const router = express.Router();

const upload = require('../middleware/upload');
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
    
module.exports = router;