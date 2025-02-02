const { getSectorsByUserId, addSector } = require('../models/sectorModel');
const { getTemperatureData } = require('../controllers/userController');

const getDashboardData = async (req) => {
  const userId = req.session.user.user_id;
  const temperatureData = await getTemperatureData(req);
  const sectors = await getSectorsByUserId(userId);

  return { temperatureData, sectors };
};

const createSector = async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const { sectorName, latitude, longitude } = req.body;

    if (!sectorName || !latitude || !longitude) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const newSectorId = await addSector(userId, sectorName, latitude, longitude);
    res.status(201).json({ 
      success: true, 
      sector: { sector_id: newSectorId, name: sectorName, latitude, longitude } 
    });
  } catch (error) {
    console.error('Error creating sector:', error);
    res.status(500).json({ error: 'Failed to create sector' });
  }
};

module.exports = { getDashboardData, createSector };