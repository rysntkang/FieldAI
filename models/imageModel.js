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
    console.error('Database error:', error);
    throw new Error('Error saving image upload data. Please try again.');
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
      SELECT i.*, r.corn_count, r.processed_date, r.processing_time, r.status
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

const getAllUploadAttempts = async () => {
  try {
    const [attempts] = await db.execute(`
      SELECT 
        ua.upload_id,
        ua.upload_date,
        u.username,  -- Retrieve username from the users table
        ua.sector_id,
        COUNT(i.image_id) AS total_images,
        SUM(CASE WHEN r.status = 'completed' THEN 1 ELSE 0 END) AS completed_images
      FROM upload_attempts ua
      LEFT JOIN sectors s ON ua.sector_id = s.sector_id
      LEFT JOIN users u ON s.user_id = u.user_id  -- Join with users to get the username
      LEFT JOIN images i ON ua.upload_id = i.upload_id
      LEFT JOIN results r ON i.image_id = r.image_id
      GROUP BY ua.upload_id
      ORDER BY ua.upload_date DESC
    `);
    return attempts;
  } catch (error) {
    console.error('Error fetching upload attempts:', error);
    throw error;
  }
};

const getFilteredUploadAttempts = async ({ 
  search = '', 
  sort = 'upload_date', 
  order = 'desc', 
  limit, 
  offset 
}) => {
  let query = `
    SELECT 
      ua.upload_id,
      ua.upload_date,
      u.username,
      ua.sector_id,
      COUNT(i.image_id) AS total_images,
      SUM(CASE WHEN r.status = 'completed' THEN 1 ELSE 0 END) AS completed_images,
      CASE 
        WHEN COUNT(i.image_id) > 0 
             AND SUM(CASE WHEN r.status = 'completed' THEN 1 ELSE 0 END) = COUNT(i.image_id) 
          THEN 'Completed'
        WHEN COUNT(i.image_id) > 0 
             AND SUM(CASE WHEN r.status = 'completed' THEN 1 ELSE 0 END) > 0 
          THEN 'Partial'
        ELSE 'Pending'
      END AS status
    FROM upload_attempts ua
    LEFT JOIN sectors s ON ua.sector_id = s.sector_id
    LEFT JOIN users u ON s.user_id = u.user_id
    LEFT JOIN images i ON ua.upload_id = i.upload_id
    LEFT JOIN results r ON i.image_id = r.image_id
    WHERE 1=1
  `;
  const values = [];

  if (search) {
    query += ' AND u.username LIKE ?';
    values.push(`%${search}%`);
  }

  query += ' GROUP BY ua.upload_id ';

  const sortOrder = (order && order.toUpperCase() === 'DESC') ? 'DESC' : 'ASC';

  if (sort === 'status') {
    if (sortOrder === 'ASC') {
      query += " ORDER BY FIELD(status, 'Completed', 'Partial', 'Pending')";
    } else {
      query += " ORDER BY FIELD(status, 'Pending', 'Partial', 'Completed')";
    }
  } else if (sort === 'upload_date') {
    query += ` ORDER BY ua.upload_date ${sortOrder}`;
  } else {
    query += ` ORDER BY ua.upload_date DESC`;
  }

  const limitNum = parseInt(limit, 10) || 50;
  query += ` LIMIT ${limitNum}`;
  if (offset !== undefined && offset !== null && offset !== '') {
    const offsetNum = parseInt(offset, 10);
    if (!isNaN(offsetNum)) {
      query += ` OFFSET ${offsetNum}`;
    }
  }

  const [rows] = await db.execute(query, values);
  return rows;
};

const deleteUploadAttempt = async (uploadId) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [imageRows] = await connection.execute(
      'SELECT image_id FROM images WHERE upload_id = ?',
      [uploadId]
    );
    const imageIds = imageRows.map(row => row.image_id);

    if (imageIds.length > 0) {
      await connection.query(
        'DELETE FROM results WHERE image_id IN (?)',
        [imageIds]
      );
    }

    await connection.query(
      'DELETE FROM images WHERE upload_id = ?',
      [uploadId]
    );

    await connection.query(
      'DELETE FROM upload_attempts WHERE upload_id = ?',
      [uploadId]
    );

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = { 
  createUploadAttemptWithImages, 
  getUploadAttempts, 
  getAttemptImages,
  getAllUploadAttempts,
  getFilteredUploadAttempts,
  deleteUploadAttempt
};