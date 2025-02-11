const { getSectorsByUserId, addSector, checkSectorNameExists, updateSector } = require('../models/sectorModel');

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

// NEW: Edit sector controller
const editSector = async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const { sectorId, sectorName, latitude, longitude } = req.body;
    if (!sectorId || !sectorName || !latitude || !longitude) {
      return res.redirect('/user/dashboard?error=' + encodeURIComponent("Missing required fields"));
    }
    // updateSector will throw an error if the new name is already used by another sector
    await updateSector(sectorId, userId, sectorName, latitude, longitude);
    res.redirect('/user/dashboard?success=' + encodeURIComponent("Sector updated successfully"));
  } catch (error) {
    console.error('Error editing sector:', error);
    res.redirect('/user/dashboard?error=' + encodeURIComponent(error.message));
  }
};

module.exports = { getDashboardData, createSector, editSector };