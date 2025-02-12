const path = require('path');
const { 
  createUploadAttemptWithImages, 
  getUploadAttempts: modelGetUploadAttempts,
  getAllUploadAttempts: modelGetAllUploadAttempts,
  getAttemptImages: modelGetAttemptImages,
  getFilteredUploadAttempts: modelGetFilteredUploadAttempts,
  deleteUploadAttempt
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
      return res.status(400).json({ error: 'No files uploaded. Please select images to upload.' });
    }

    const sectorId = req.body.sectorId;

    // Prepare an array to hold file information for the DB.
    // In local mode, we use the file path.
    // In GCS mode, we upload each file and use its public URL.
    let filesInfo;
    if (process.env.INSTANCE_UNIX_SOCKET) {
      // Upload each file to GCS and get its URL.
      filesInfo = await Promise.all(
         req.files.map(async (file) => {
          const publicUrl = path.basename(await uploadToGCS(file));
          console.log(publicUrl);
          return { file_path: publicUrl };
        })
      );
    } else {
      // Local mode: the file path is already set by multer.
      filesInfo = req.files.map(file => ({
        file_path: `/uploads/${file.filename}`
      }));
    }


    // Create a DB record for this upload attempt.
    const { uploadId, imageIds } = await createUploadAttemptWithImages(sectorId, filesInfo);

    // Now process each image.
    // In local mode, we pass the file system path.
    // In GCS mode, we pass the file buffer directly from req.files.
    imageIds.forEach((imageId, index) => {
      if (process.env.INSTANCE_UNIX_SOCKET) {
        // Use the original file buffer.
        console.log(filesInfo[index].file_path);
        processImage(imageId, filesInfo[index].file_path);
      } else {
        // Build the full file path.
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
    res.status(500).json({ error: 'Image upload failed. Please try again.' });
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

const getFilteredUploadAttempts = async (options) => {
  try {
    const attempts = await modelGetFilteredUploadAttempts(options);
    for (const attempt of attempts) {
      attempt.images = await modelGetAttemptImages(attempt.upload_id);
    }
    return attempts;
  } catch (error) {
    console.error('Controller error fetching filtered attempts:', error);
    throw error;
  }
};

const deleteUploadAttemptController = async (req, res) => {
  try {
    const { uploadId } = req.params;
    await deleteUploadAttempt(uploadId);
    return res.json({ success: true, message: 'Upload attempt deleted successfully' });
  } catch (error) {
    console.error("Error deleting upload attempt:", error);
    return res.status(500).json({ success: false, message: 'Failed to delete upload attempt. Please try again.' });
  }
};



module.exports = { 
  handleImageUpload, 
  getUploadAttempts,
  getAllUploadAttempts,
  getFilteredUploadAttempts,
  deleteUploadAttemptController
};