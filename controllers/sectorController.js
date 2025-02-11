const { getSectorsByUserId, addSector, checkSectorNameExists, updateSector, removeSector, getSectorById } = require('../models/sectorModel');

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
    
    if (!sectorName) {
      return res.redirect(
        '/user/dashboard?error=' + encodeURIComponent('Sector name is required.')
      );
    }

    if (!latitude || !longitude) {
      return res.redirect(
        '/user/dashboard?error=' + encodeURIComponent('Location missing. Please ensure location is enabled by refreshing.')
      );
    }
    
    const nameExists = await checkSectorNameExists(userId, sectorName);
    if (nameExists) {
      return res.redirect(
        '/user/dashboard?error=' + encodeURIComponent('Sector name already exists.')
      );
    }
    
    await addSector(userId, sectorName, latitude, longitude);
    
    res.redirect(
      '/user/dashboard?success=' + encodeURIComponent('Sector added successfully.')
    );
  } catch (error) {
    console.error('Sector creation error:', error);
    res.redirect(
      '/user/dashboard?error=' + encodeURIComponent(error.message || 'Error adding sector.')
    );
  }
};


const editSector = async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const { sectorId, sectorName, latitude, longitude } = req.body;
    
    if (!sectorId || !sectorName) {
      return res.redirect('/user/dashboard?error=' + encodeURIComponent("Missing required fields"));
    }

    if (!latitude || !longitude) {
      return res.redirect(
        '/user/dashboard?error=' + encodeURIComponent('Location missing. Please ensure location is enabled by refreshing.')
      );
    }

    const originalSector = await getSectorById(sectorId, userId);
    if (!originalSector) {
      return res.redirect('/user/dashboard?error=' + encodeURIComponent("Sector not found"));
    }

    if (
      originalSector.name === sectorName &&
      originalSector.latitude.toString() === latitude.toString() &&
      originalSector.longitude.toString() === longitude.toString()
    ) {
      return res.redirect('/user/dashboard?error=' + encodeURIComponent("No changes were made."));
    }

    await updateSector(sectorId, userId, sectorName, latitude, longitude);
    res.redirect('/user/dashboard?success=' + encodeURIComponent("Sector updated successfully"));
  } catch (error) {
    console.error('Error editing sector:', error);
    res.redirect('/user/dashboard?error=' + encodeURIComponent(error.message || "Error updating sector."));
  }
};

const deleteSector = async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const sectorId = req.params.sectorId;
    await removeSector(sectorId, userId);
    res.json({ message: "Sector deleted successfully." });
  } catch (error) {
    console.error('Error deleting sector:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getDashboardData, createSector, editSector, deleteSector };