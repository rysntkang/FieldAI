const db = require('../config/db');
const sharp = require('sharp');
const fs = require('fs').promises;
const axios = require('axios');

const processImage = async (imageId, imagePath) => {
  try {
    // Mark image as processing in the DB
    await db.execute(
      'UPDATE results SET status = "processing", processed_date = NOW() WHERE image_id = ?',
      [imageId]
    );
    const startTime = Date.now();

    let response;
    let cornCount;
    let prediction;

    // Cloud / App Engine environment
    if (process.env.INSTANCE_UNIX_SOCKET) {
      console.log(`mlservice ${imagePath}`);
      const { Storage } = require('@google-cloud/storage');
      const storage = new Storage();
      const aiplatform = require('@google-cloud/aiplatform');
      const { PredictionServiceClient } = aiplatform.v1;
      const clientOptions = {
        apiEndpoint: 'asia-southeast1-aiplatform.googleapis.com',
      };
      const client = new PredictionServiceClient(clientOptions);
      const projectId = 'fieldai-447606';
      const location = 'asia-southeast1'; // Adjust to your region if necessary
      const endpointId = '5946638270082318336'; // Your deployed model's endpoint
      const endpoint = `projects/${projectId}/locations/${location}/endpoints/${endpointId}`;
      const bucketName = process.env.GCLOUD_STORAGE_BUCKET;
      
      // Download file from Cloud Storage and resize
      let file;
      [file] = await storage.bucket(bucketName).file(imagePath).download();
      file = await sharp(file)
        .resize(640, 640)
        .toBuffer();
      const base64Image = file.toString('base64');
      
      const { helpers } = aiplatform;
      const instance = helpers.toValue({ images: base64Image });
      const instances = [instance];
      
      [response] = await client.predict({
        endpoint,
        instances,
      });
      console.log(response);
      
      // Parse prediction (assuming the string has the format "something:<cornCount>")
      prediction = response.predictions[0].stringValue;
      cornCount = prediction.split(':')[1];
      
    } 
    // Local environment
    else {
      // Read the image from disk and resize to 640x640
      const imageBuffer = await fs.readFile(imagePath);
      const resizedBuffer = await sharp(imageBuffer)
        .resize(640, 640)
        .toBuffer();
      const base64Image = resizedBuffer.toString('base64');
      
      // Send the resized image to the local ML service.
      // Adjust the payload key as needed if your ML service expects a different structure.
      response = await axios.post('http://127.0.0.1:5000/predict', {
        instances: [{ images: base64Image }]
      });
      
      // Parse prediction
      prediction = response.data.predictions[0];
      cornCount = parseInt(prediction.split(':')[1]);
    }
    
    const processingTime = Date.now() - startTime;
    console.log(cornCount, processingTime, imageId);

    // Update the results table with the completed status
    await db.execute(
      `
      UPDATE results 
      SET 
        corn_count = ?, 
        processing_time = ?,
        processed_date = NOW(),
        status = "completed",
        error_message = NULL
      WHERE image_id = ?
      `,
      [cornCount, processingTime, imageId]
    );
    
  } catch (error) {
    // Update the DB with the error message if processing fails
    await db.execute(
      'UPDATE results SET status = "failed", error_message = ?, processed_date = NOW() WHERE image_id = ?',
      [error.message.substring(0, 255), imageId]
    );
    console.error(`Mock processing failed for image ${imageId}:`, error);
  }
};

module.exports = { processImage };
