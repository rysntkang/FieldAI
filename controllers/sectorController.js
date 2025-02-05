const { getSectorsByUserId, addSector, checkSectorNameExists } = require('../models/sectorModel');
const { getTemperatureData } = require('../controllers/userController');

const createSector = async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const { sectorName, latitude, longitude } = req.body;

    if (!sectorName || !latitude || !longitude) {
      return res.redirect('/user/dashboard');
    }

    const nameExists = await checkSectorNameExists(userId, sectorName);
    if (nameExists) {
      return res.redirect('/user/dashboard');
    }

    await addSector(userId, sectorName, latitude, longitude);
    
    res.redirect('/user/dashboard');

  } catch (error) {
    console.error('Sector creation error:', error);
    res.redirect('/user/dashboard');
  }
};

module.exports = { createSector };