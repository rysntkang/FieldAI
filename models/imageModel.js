const db = require('../config/db');

const createUploadAttemptWithImages = async (sectorId, files) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [uploadResult] = await connection.execute(
      'INSERT INTO upload_attempts (sector_id) VALUES (?)',
      [sectorId]
    );
    const uploadId = uploadResult.insertId;

    let imageIds = [];
    if (files.length > 0) {
      const [imageInsertResult] = await connection.query(
        'INSERT INTO images (upload_id, file_path) VALUES ?',
        [files.map(file => [uploadId, file.file_path])]
      );

      const [imageRows] = await connection.execute(
        'SELECT image_id FROM images WHERE upload_id = ? ORDER BY image_id ASC',
        [uploadId]
      );
      imageIds = imageRows.map(row => row.image_id);

      await connection.query(
        `INSERT INTO results 
          (image_id, status, corn_count, processing_time, error_message) 
         VALUES ?`,
        [imageIds.map(imageId => [imageId, 'pending', null, null, null])]
      );
    }

    await connection.commit();
    return { uploadId, imageIds };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
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
  createUploadAttemptWithImages, 
  getUploadAttempts, 
  getAttemptImages 
};