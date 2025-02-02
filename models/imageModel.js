const db = require('../config/db');

const createUploadAttempt = async (sectorId) => {
  try {
    const [result] = await db.execute(
      'INSERT INTO upload_attempts (sector_id) VALUES (?)',
      [sectorId]
    );
    return result.insertId;
  } catch (error) {
    console.error('Error creating upload attempt:', error);
    throw error;
  }
};

const saveImageRecords = async (uploadId, files) => {
  try {
    const query = `
      INSERT INTO images (upload_id, file_path)
      VALUES ?
    `;
    const values = files.map(file => [uploadId, file.file_path]);
    await db.query(query, [values]);
  } catch (error) {
    console.error('Error saving image records:', error);
    throw error;
  }
};

const getUploadAttempts = async (sectorId) => {
  try {
    const [attempts] = await db.execute(`
      SELECT 
        ua.upload_id, 
        ua.upload_date,
        COUNT(i.image_id) AS total_images,
        SUM(CASE WHEN r.status = 'completed' THEN 1 ELSE 0 END) AS completed_images
      FROM upload_attempts ua
      LEFT JOIN images i ON ua.upload_id = i.upload_id
      LEFT JOIN results r ON i.image_id = r.image_id
      WHERE ua.sector_id = ?
      GROUP BY ua.upload_id
      ORDER BY ua.upload_date DESC
    `, [sectorId]);
    return attempts;
  } catch (error) {
    console.error('Error fetching upload attempts:', error);
    throw error;
  }
};

const getAttemptImages = async (uploadId) => {
  try {
    const [images] = await db.execute(`
      SELECT i.*, r.corn_count, r.processed_date, r.status
      FROM images i
      LEFT JOIN results r ON i.image_id = r.image_id
      WHERE i.upload_id = ?
    `, [uploadId]);
    return images;
  } catch (error) {
    console.error('Error fetching attempt images:', error);
    throw error;
  }
};

module.exports = { 
  createUploadAttempt, 
  saveImageRecords,
  getUploadAttempts,
  getAttemptImages
};