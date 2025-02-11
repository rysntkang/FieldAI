const db = require('../config/db');

const getSectorsByUserId = async (userId) => {
  try {
    const [rows] = await db.execute(
      'SELECT sector_id, name, latitude, longitude FROM sectors WHERE user_id = ?',
      [userId]
    );
    return rows;
  } catch (error) {
    console.error('Error fetching sectors:', error);
    throw error;
  }
};

const checkSectorNameExists = async (userId, name) => {
  try {
    const [rows] = await db.execute(
      'SELECT 1 FROM sectors WHERE user_id = ? AND name = ?',
      [userId, name]
    );
    return rows.length > 0;
  } catch (error) {
    console.error('Error checking sector name:', error);
    throw error;
  }
};

const addSector = async (userId, name, latitude, longitude) => {
  if (await checkSectorNameExists(userId, name)) {
    throw new Error('Sector name already exists');
  }
  try {
    const [result] = await db.execute(
      'INSERT INTO sectors (user_id, name, latitude, longitude) VALUES (?, ?, ?, ?)',
      [userId, name, latitude, longitude]
    );
    return result.insertId;
  } catch (error) {
    console.error('Error adding sector:', error);
    throw error;
  }
};

// NEW: Update sector function
const updateSector = async (sectorId, userId, name, latitude, longitude) => {
  try {
    // Check if another sector (other than the one being updated) already has this name
    const [rows] = await db.execute(
      'SELECT sector_id FROM sectors WHERE user_id = ? AND name = ? AND sector_id != ?',
      [userId, name, sectorId]
    );
    if (rows.length > 0) {
      throw new Error('Sector name already exists');
    }
    const [result] = await db.execute(
      'UPDATE sectors SET name = ?, latitude = ?, longitude = ? WHERE sector_id = ? AND user_id = ?',
      [name, latitude, longitude, sectorId, userId]
    );
    return result;
  } catch (error) {
    console.error('Error updating sector:', error);
    throw error;
  }
};

module.exports = { 
  getSectorsByUserId, 
  addSector,
  checkSectorNameExists,
  updateSector
};