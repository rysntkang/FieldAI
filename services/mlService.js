const db = require('../config/db');

const processImageMock = async (imageId) => {
  try {
    await db.execute(
      'UPDATE results SET status = "processing" WHERE image_id = ?',
      [imageId]
    );

    const processingTime = (Math.random() * 2 + 1).toFixed(2);
    await new Promise(resolve => setTimeout(resolve, processingTime * 1000));

    const cornCount = Math.floor(Math.random() * 100) + 50;
    
    await db.execute(`
      UPDATE results 
      SET corn_count = ?, 
          processing_time = ?,
          processed_date = NOW(),
          status = "completed"
      WHERE image_id = ?
    `, [cornCount, processingTime, imageId]);

  } catch (error) {
    await db.execute(
      'UPDATE results SET status = "failed" WHERE image_id = ?',
      [imageId]
    );
    console.error('Mock processing failed:', error);
  }
};

module.exports = { processImageMock };