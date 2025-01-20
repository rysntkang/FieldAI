const express = require('express');
const {
    getTemperatureData,
    getRainfallAndIrrigationData,
} = require('../controllers/userController');

const router = express.Router();

const ensureAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }
    return res.redirect('/login');
};

// Dashboard Route: Fetch and render all data
router.get('/user/dashboard', ensureAuthenticated, async (req, res) => {
    try {
        const temperatureData = await getTemperatureData(req);
        const rainfallData = await getRainfallAndIrrigationData(req);

        // Render the dashboard with both datasets
        res.render('pages/user/dashboard', {
            user: req.session.user,
            temperatureData,
            rainfallData,
        });
    } catch (error) {
        console.error('Error rendering dashboard:', error.message || error);
        res.status(500).send('An error occurred while loading the dashboard.');
    }
});

// Separate endpoint for rainfall data (used by AJAX in frontend)
router.get('/user/rainfall-irrigation', ensureAuthenticated, async (req, res) => {
    try {
        const rainfallData = await getRainfallAndIrrigationData(req);
        res.json(rainfallData);
    } catch (error) {
        console.error('Error fetching rainfall data:', error.message || error);
        res.status(500).json({ error: 'An error occurred while fetching rainfall data.' });
    }
});

module.exports = router;
