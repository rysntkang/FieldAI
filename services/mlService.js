const db = require('../config/db');
const sharp = require('sharp');
const fs = require('fs').promises;
const axios = require('axios');

const processImage = async (imageId, imagePath) => {
  try {
    await db.execute(
      'UPDATE results SET status = "processing", processed_date = NOW() WHERE image_id = ?',
      [imageId]
    );
    const startTime = Date.now();

    let response;
    let cornCount;
    let prediction;

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
      const endpoint = process.env.VERTEX_ENDPOINT;
      const bucketName = process.env.GCLOUD_STORAGE_BUCKET;

      let file;
      [file] = await storage.bucket(bucketName).file(imagePath).download();
      file = await sharp(file).resize(640, 640).toBuffer();
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
      console.log(`Processing local image from: ${imagePath}`);

      try {
        await fs.access(imagePath);
      } catch (accessErr) {
        throw new Error(`File not found at path: ${imagePath}`);
      }

      const imageBuffer = await fs.readFile(imagePath);
      const resizedBuffer = await sharp(imageBuffer).resize(640, 640).toBuffer();
      const base64Image = resizedBuffer.toString('base64');

      response = await axios.post('http://127.0.0.1:5000/predict', {
        instances: [{ images: base64Image }]
      });
      
      // Parse prediction (assuming the returned string is in the format "something:<cornCount>")
      prediction = response.data.predictions[0];
      cornCount = parseInt(prediction.split(':')[1], 10);
    }
    
    const processingTime = Date.now() - startTime;
    console.log(`Image ID: ${imageId} processed in ${processingTime} ms with corn count: ${cornCount}`);

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
    await db.execute(
      'UPDATE results SET status = "failed", error_message = ?, processed_date = NOW() WHERE image_id = ?',
      [error.message.substring(0, 255), imageId]
    );
    console.error(`Processing failed for image ${imageId}:`, error);
  }
};

module.exports = { processImage };
