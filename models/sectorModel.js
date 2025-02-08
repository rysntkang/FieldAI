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

module.exports = { 
  getSectorsByUserId, 
  addSector,
  checkSectorNameExists
};