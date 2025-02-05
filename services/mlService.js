const db = require('../config/db');
const axios = require('axios');
const fs = require('fs').promises;

const processImage = async (imageId, imagePath) => {
  try {
    await db.execute(
      'UPDATE results SET status = "processing", processed_date = NOW() WHERE image_id = ?',
      [imageId]
    );

    const imageBuffer = await fs.readFile(imagePath);
    const base64Image = imageBuffer.toString('base64');

    const startTime = Date.now();

    //gcloud
    let response;
    if (process.env.INSTANCE_UNIX_SOCKET){
      const projectId = 'fieldai-447606';
      const location = 'asia-southeast1'; // Adjust to your region
      const endpointId = '1560835920465231872'; // The endpoint where the model is deployed
      const endpoint = `projects/${projectId}/locations/${location}/endpoints/${endpointId}`;
    
      const instance = { images:base64Image };
      const instances = [instance];
      // Send prediction request
      const [response] = await client.predict({
      endpoint,
      instances,
      });
    } else{
      response = await axios.post('http://127.0.0.1:5000/predict',{
        instances: [{images: [base64Image] }]
      });
    }

    const prediciton = response.data.predictions[0];
    const cornCount = parseInt(prediciton.split(':')[1]);
    const processingTime = (Date.now() - startTime);

    console.log(cornCount, processingTime, imageId);

    await db.execute(`
      UPDATE results 
      SET 
        corn_count = ?, 
        processing_time = ?,
        processed_date = NOW(),
        status = "completed",
        error_message = NULL
      WHERE image_id = ?`,
      [cornCount, processingTime, imageId]  // 3 parameters match 3 placeholders
    );

  } catch (error) {
    await db.execute(
      'UPDATE results SET status = "failed", error_message = ?, processed_date = NOW() WHERE image_id = ?',
      [error.message.substring(0, 255), imageId]
    );
    console.error(`Mock processing failed for image ${imageId}:`, error);
  }
};

module.exports = { processImage };