const axios = require('axios');
const { getTemperatureData } = require('../controllers/userController');
const { getSectorsByUserId, addSector } = require('../models/sectorModel');

const getDashboardData = async (req) => {
    const userId = req.session.user.user_id;
    const temperatureData = await getTemperatureData(req);
    const sectors = await getSectorsByUserId(userId);

    return { temperatureData, sectors };
};

const createSector = async (req) => {
    const userId = req.session.user.user_id;
    const { sectorName, latitude, longitude } = req.body;

    if (!sectorName || !latitude || !longitude) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    const newSectorId = await addSector(userId, sectorName, latitude, longitude);
    return { sector_id: newSectorId, name: sectorName, latitude, longitude };
};

module.exports = { getDashboardData, createSector };
