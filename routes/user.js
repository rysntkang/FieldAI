const express = require('express');
const { getTemperatureData } = require('../controllers/userController');

const router = express.Router();

const ensureAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }
    return res.redirect('/login');
};

router.get('/user/dashboard', ensureAuthenticated, async (req, res) => {
    try {
        const temperatureData = await getTemperatureData(req, res);

        // Render the dashboard with the fetched temperature data
        res.render('pages/user/dashboard', {
            user: req.session.user,
            temperatureData,
        });
    } catch (error) {
        console.error('Error rendering dashboard:', error.message || error);
        res.status(500).send('An error occurred while loading the dashboard.');
    }
});

module.exports = router;
