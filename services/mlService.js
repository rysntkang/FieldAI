const db = require('../config/db');
const axios = require('axios');

const processImage = async (imageId, imagePath) => {
  try {
    await db.execute(
      'UPDATE results SET status = "processing", processed_date = NOW() WHERE image_id = ?',
      [imageId]
    );

    // Converting Image to Base64
    // Uploading Base64 Image to ML Model

    //gcloud
    //const projectId = 'fieldai-447606';
    // const location = 'asia-southeast1'; // Adjust to your region
    // const endpointId = '1560835920465231872'; // The endpoint where the model is deployed
    // const endpoint = projects/${projectId}/locations/${location}/endpoints/${endpointId};
    // const storage = new Storage();
    // const bucketName = 'maize_dataset'; //Extract bucket name from your URI
    // const imageName = 'T0001_XM_20120806090255_01_jpg.rf.aea88fcdcd1838a15c11707eac94bf4e.jpg'; // Extract image name from your URI
    // // Define the input instances for your model (this will vary based on the model type)
    // const [file] = await storage.bucket(bucketName).file(imageName).download();

    // const data = {
    //   "instances":[images:${base64Image}]
    // };
    
    // axios.post('http://127.0.0.1:5000/predict', data, {
    //   headers: {
    //     'Content-Type': 'application/json' // Crucial for JSON requests
    //   }
    // })
    // .then(response => {
    //   console.log(response.data); // Access the response from Flask
    // })

    const base64Image = file.toString('base64');

    const startTime = Date.now();
    // const response = await axios.post('http://127.0.0.1:5000/predict',{
    //   instances: [{images: [base64Image] }]
    // })

    await axios.post('http://127.0.0.1:5000/predict',{
      instances: [{images: [base64Image] }]
    })
    .then(response => {
      console.log(response.data);
    })


    // Handle the response
    // console.log(Prediction results: ${JSON.stringify(response.predictions)});
    // }
    // predictCustom().catch(console.error);

    await db.execute(`
      UPDATE results 
      SET 
        corn_count = ?, 
        processing_time = ?,
        processed_date = NOW(),
        status = "completed",
        error_message = NULL
      WHERE image_id = ?
    `, [cornCount, processingTime, imageId]);

  } catch (error) {
    await db.execute(
      'UPDATE results SET status = "failed", error_message = ?, processed_date = NOW() WHERE image_id = ?',
      [error.message.substring(0, 255), imageId]
    );
    console.error(`Mock processing failed for image ${imageId}:`, error);
  }
};

module.exports = { processImage };