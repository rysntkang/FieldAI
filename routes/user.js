const express = require('express');
const { getTemperatureData, getRainfallAndIrrigationData } = require('../controllers/userController');
const multer = require('multer');
const path = require('path');

const router = express.Router();

const ensureAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }
    return res.redirect('/login');
};

router.get('/user/dashboard', ensureAuthenticated, async (req, res) => {
    try {
        const temperatureData = await getTemperatureData(req);
        const rainfallData = await getRainfallAndIrrigationData(req);

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
