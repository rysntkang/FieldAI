const db = require('../config/db');
const sharp = require('sharp');
const fs = require('fs').promises;

const processImage = async (imageId, imagePath) => {
  try {
    await db.execute(
      'UPDATE results SET status = "processing", processed_date = NOW() WHERE image_id = ?',
      [imageId]
    );
    const startTime = Date.now();


    //gcloud
    let response;
    let maizeCount;
    let prediction;
    //appengine environment
    if (process.env.INSTANCE_UNIX_SOCKET){
      console.log(`mlservice ${imagePath}`)
      const { Storage } = require('@google-cloud/storage');
      storage = new Storage();
      const aiplatform = require('@google-cloud/aiplatform');
      const {PredictionServiceClient} = aiplatform.v1;
      const clientOptions = {
        apiEndpoint: 'asia-southeast1-aiplatform.googleapis.com',
      };
      const client = new PredictionServiceClient(clientOptions);
      const projectId = 'fieldai-447606';
      const location = 'asia-southeast1'; // Adjust to your region
      const endpointId = '5946638270082318336'; // The endpoint where the model is deployed
      const endpoint = `projects/${projectId}/locations/${location}/endpoints/${endpointId}`;
      const bucketName = process.env.GCLOUD_STORAGE_BUCKET;
      let file;
      [file] = await storage.bucket(bucketName).file(imagePath).download();
      file = await sharp(file).resize(640, 640).toBuffer();
      const base64Image = file.toString('base64');
      const {helpers} = aiplatform;
      const instance = helpers.toValue({ images:base64Image });
      const instances = [instance];
      [response] = await client.predict({
      endpoint,
      instances,
      });
      console.log(response);
      prediction = response.predictions[0].stringValue;
      cornCount = prediction.split(':')[1];
    } 
    //local env
    else{
      const axios = require('axios');
      const imageBuffer = await fs.readFile(imagePath);
      const base64Image = imageBuffer.toString('base64');
      response = await axios.post('http://127.0.0.1:5000/predict',{
        instances: [{images: [base64Image] }]
      });
    prediciton = response.data.predictions[0];
    cornCount = parseInt(prediciton.split(':')[1]);
    }
    
    
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