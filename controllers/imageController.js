const path = require('path');
const { 
  createUploadAttemptWithImages, 
  getUploadAttempts: modelGetUploadAttempts,
  getAllUploadAttempts: modelGetAllUploadAttempts,
  getAttemptImages: modelGetAttemptImages
} = require('../models/imageModel');
const { processImage } = require('../services/mlService');

let uploadToGCS;
if (process.env.INSTANCE_UNIX_SOCKET) {
  const { Storage } = require('@google-cloud/storage');
  const storageClient = new Storage();
  const bucket = storageClient.bucket(process.env.GCLOUD_STORAGE_BUCKET);
  
  uploadToGCS = (file) => {
    return new Promise((resolve, reject) => {
      const blob = bucket.file(Date.now() + '-' + file.originalname);
      const blobStream = blob.createWriteStream({
        resumable: false,
        contentType: file.mimetype
      });

      blobStream.on('error', (err) => reject(err));
      blobStream.on('finish', () => {
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
        console.log(`File uploaded to GCS: ${publicUrl}`);
        resolve(publicUrl);
      });

      blobStream.end(file.buffer);
    });
  };
}

const handleImageUpload = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const sectorId = req.body.sectorId;

    let filesInfo;
    if (process.env.INSTANCE_UNIX_SOCKET) {
      filesInfo = await Promise.all(
         req.files.map(async (file) => {
          const publicUrl = path.basename(await uploadToGCS(file));
          console.log(publicUrl);
          return { file_path: publicUrl };
        })
      );
    } else {
      filesInfo = req.files.map(file => ({
        file_path: `/uploads/${file.filename}`
      }));
    }

    const { uploadId, imageIds } = await createUploadAttemptWithImages(sectorId, filesInfo);

    imageIds.forEach((imageId, index) => {
      if (process.env.INSTANCE_UNIX_SOCKET) {
        console.log(filesInfo[index].file_path);
        processImage(imageId, filesInfo[index].file_path);
      } else {
        processImage(
          imageId,
          path.join(__dirname, `../public${filesInfo[index].file_path}`)
        );
      }
    });

    res.json({ 
      success: true,
      message: `${filesInfo.length} images uploaded successfully`,
      uploadId
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Image upload failed' });
  }
};

const getUploadAttempts = async (sectorId) => {
  try {
    const attempts = await modelGetUploadAttempts(sectorId);
    for (const attempt of attempts) {
      attempt.images = await modelGetAttemptImages(attempt.upload_id);
    }
    return attempts;
  } catch (error) {
    console.error('Controller error fetching attempts:', error);
    throw error;
  }
};

const getAllUploadAttempts = async () => {
  try {
    const attempts = await modelGetAllUploadAttempts();
    for (const attempt of attempts) {
      attempt.images = await modelGetAttemptImages(attempt.upload_id);
    }
    return attempts;
    } catch (error) {
      console.error('Controller error fetching all attempts:', error);
      throw error;
    }
};

module.exports = { 
  handleImageUpload, 
  getUploadAttempts,
  getAllUploadAttempts 
};