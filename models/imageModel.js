const db = require('../config/db');

const createUploadAttempt = async (sectorId) => {
  const [result] = await db.execute(
    'INSERT INTO upload_attempts (sector_id) VALUES (?)',
    [sectorId]
  );
  return result.insertId;
};

const saveImageRecords = async (uploadId, files) => {
  const query = `
    INSERT INTO images (upload_id, file_path)
    VALUES ?
  `;
  const values = files.map(file => [uploadId, file.file_path]);
  await db.query(query, [values]);
};

const getUploadAttempts = async (sectorId) => {
  const [attempts] = await db.execute(`
    SELECT ua.upload_id, ua.upload_date, 
           COUNT(i.image_id) AS image_count
    FROM upload_attempts ua
    LEFT JOIN images i ON ua.upload_id = i.upload_id
    WHERE ua.sector_id = ?
    GROUP BY ua.upload_id
    ORDER BY ua.upload_date DESC
  `, [sectorId]);
  return attempts;
};

const getAttemptImages = async (uploadId) => {
  const [images] = await db.execute(`
    SELECT i.*, r.corn_count, r.processed_date, r.status
    FROM images i
    LEFT JOIN results r ON i.image_id = r.image_id
    WHERE i.upload_id = ?
  `, [uploadId]);
  return images;
};

module.exports = { 
  createUploadAttempt, 
  saveImageRecords,
  getUploadAttempts,
  getAttemptImages
};